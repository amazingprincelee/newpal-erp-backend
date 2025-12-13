// models/finance.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  transactionNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['REVENUE', 'EXPENSE'], required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  description: String,
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'PAID'], default: 'PENDING' },
  proofOfPayment: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const withdrawalRequestSchema = new mongoose.Schema({
  requestNumber: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  purpose: { type: String, required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['PENDING', 'OTP_REQUIRED', 'COMPLETED', 'FAILED', 'REJECTED'],
    default: 'PENDING'
  },
  paystackReference: String,
  paystackTransferCode: String,
  proofDocuments: [String], // Cloudinary URLs
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
}, { timestamps: true });

export const Transaction = mongoose.model('Transaction', transactionSchema);
export const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);