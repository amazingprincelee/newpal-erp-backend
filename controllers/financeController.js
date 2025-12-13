// controllers/financeController.js
import { Transaction, WithdrawalRequest } from '../models/finance.js';
import User from '../models/user.js';
import { getPaystackBalance, createRecipient, initiateTransfer, finalizeTransfer } from '../config/paystack.js';
import { createNotification } from '../utils/notificationHelper.js';

// Global recipient (cached)
let financeRecipient = null;

const getFinanceRecipient = async () => {
  if (financeRecipient) return financeRecipient;

  try {
    // Try to create — if exists, Paystack returns existing
    const recipient = await createRecipient();
    financeRecipient = recipient.recipient_code;
    console.log("Finance recipient ready:", financeRecipient);
    return financeRecipient;
  } catch (error) {
    console.error("Recipient error:", error.message);
    throw error;
  }
};

// Dashboard Stats
export const getFinanceStats = async (req, res) => {
  try {
    const balance = await getPaystackBalance();
    const pending = await WithdrawalRequest.countDocuments({ status: 'PENDING' });
    const completedToday = await WithdrawalRequest.countDocuments({
      status: 'COMPLETED',
      updatedAt: { $gte: new Date().setHours(0,0,0,0) }
    });

    res.json({
      success: true,
      data: { paystackBalance: balance, pendingWithdrawals: pending, completedToday }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Withdrawal Request (Finance)
export const createWithdrawalRequest = async (req, res) => {
  try {
    const { amount, purpose } = req.body;
    const count = await WithdrawalRequest.countDocuments() + 1;
    const request = new WithdrawalRequest({
      requestNumber: `WR-${new Date().getFullYear()}-${String(count).padStart(6,'0')}`,
      amount,
      purpose,
      requestedBy: req.user._id
    });
    await request.save();

    // Notify MD
    const mds = await User.find({ role: { $in: ['admin', 'super-admin'] } });
    for (const md of mds) {
      await createNotification({
        userId: md._id,
        title: 'New Withdrawal Request',
        message: `₦${amount.toLocaleString()} requested by Finance for "${purpose}"`,
        type: 'approval',
        link: `/finance/withdrawals`
      });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// MD Initiates Transfer → Paystack Sends OTP
export const initiateWithdrawalTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await WithdrawalRequest.findById(id).populate('requestedBy');
    if (!request || request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const recipient = await getFinanceRecipient();

    const transfer = await initiateTransfer({
      amount: request.amount,
      recipient,
      reason: request.purpose,
      reference: request.requestNumber
    });

    request.paystackReference = transfer.reference;
    if (transfer.status === 'otp') {
      request.status = 'OTP_REQUIRED';
      await request.save();

      await createNotification({
        userId: request.requestedBy,
        title: 'Withdrawal OTP Sent',
        message: `Paystack sent OTP to MD for your ₦${request.amount} withdrawal.`,
        type: 'info'
      });

      return res.json({ success: true, message: 'OTP sent to MD by Paystack' });
    }

    // Rare: no OTP
    request.status = 'COMPLETED';
    request.paystackTransferCode = transfer.transfer_code;
    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// MD Enters Paystack OTP → Finalize
export const finalizeWithdrawalWithOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const request = await WithdrawalRequest.findById(id);
    if (!request || request.status !== 'OTP_REQUIRED') {
      return res.status(400).json({ success: false, message: 'No OTP pending' });
    }

    const result = await finalizeTransfer({
      transfer_code: request.paystackReference,
      otp
    });

    if (result.status === 'success') {
      request.status = 'COMPLETED';
      request.paystackTransferCode = result.transfer_code;
      await request.save();

      await createNotification({
        userId: request.requestedBy,
        title: 'Withdrawal Completed!',
        message: `₦${request.amount.toLocaleString()} has been transferred to finance account.`,
        type: 'success'
      });

      return res.json({ success: true, data: request });
    }

    res.status(400).json({ success: false, message: 'Invalid OTP' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload Proof
export const uploadProof = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await WithdrawalRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.files?.proof) {
      const result = await require('../config/cloudinary.js').upload(req.files.proof[0]);
      request.proofDocuments.push(result.secure_url);
      await request.save();
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};