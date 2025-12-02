import express from "express";
import {
  createCustomer,
  approveCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
} from "../controllers/customerController.js";

import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// CREATE customer (public or protected? add authenticate if needed)
router.post("/", authenticate, createCustomer);

// GET all customers
router.get("/", authenticate, getCustomers);

// GET single customer by ID
router.get("/:id", authenticate, getCustomerById);

// UPDATE customer
router.put("/:id", authenticate, updateCustomer);

// DELETE customer
router.delete("/:id", authenticate, deleteCustomer);

// APPROVE customer (only authenticated admin should approve)
router.put("/approve/:id", authenticate, approveCustomer);

export default router;
