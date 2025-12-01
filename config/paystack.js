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

// Get Paystack wallet balance
export const getPaystackBalance = async () => {
  try {
    const response = await paystack.get("/balance");
    return response.data.data[0].balance / 100; // Convert to Naira
  } catch (error) {
    console.error("Balance error:", error.response?.data);
    throw new Error("Unable to fetch Paystack balance");
  }
};

// Create transfer recipient
export const createRecipient = async ({ name, account_number, bank_code }) => {
  try {
    const response = await paystack.post("/transferrecipient", {
      type: "nuban",
      name,
      account_number,
      bank_code,
      currency: "NGN"
    });

    return response.data.data.recipient_code;
  } catch (error) {
    console.error("Recipient error:", error.response?.data);
    throw new Error("Unable to create transfer recipient");
  }
};

// Transfer money
export const transferFunds = async ({ amount, recipient_code }) => {
  try {
    const response = await paystack.post("/transfer", {
      source: "balance",
      amount: amount * 100,
      recipient: recipient_code,
      reason: "Finance withdrawal"
    });

    return response.data.data;
  } catch (error) {
    console.error("Transfer error:", error.response?.data);
    throw new Error("Unable to transfer funds");
  }
};
