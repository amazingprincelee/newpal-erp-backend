// config/paystack.js
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

export const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
    "Content-Type": "application/json"
  }
});

// Get balance
export const getPaystackBalance = async () => {
  try {
    const response = await paystack.get("/balance");
    return response.data.data[0].balance / 100;
  } catch (error) {
    throw new Error("Failed to fetch balance");
  }
};

// Create recipient (once)
export const createRecipient = async () => {
  try {
    const response = await paystack.post("/transferrecipient", {
      type: "nuban",
      name: process.env.FINANCE_ACCOUNT_NAME,
      account_number: process.env.FINANCE_ACCOUNT_NUMBER,
      bank_code: process.env.FINANCE_BANK_CODE,
      currency: "NGN"
    });
    return response.data.data;
  } catch (error) {
    throw new Error("Failed to create recipient: " + error.response?.data?.message);
  }
};

// Initiate transfer (Paystack sends OTP)
export const initiateTransfer = async ({ amount, recipient, reason, reference }) => {
  try {
    const response = await paystack.post("/transfer", {
      source: "balance",
      amount: amount * 100,
      recipient,
      reason,
      reference
    });
    return response.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Transfer failed");
  }
};

// Finalize with OTP
export const finalizeTransfer = async ({ transfer_code, otp }) => {
  try {
    const response = await paystack.post("/transfer/finalize_transfer", {
      transfer_code,
      otp
    });
    return response.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "OTP verification failed");
  }
};