// routes/customerRoutes.js
import express from "express";
import {
  createCustomer,
  approveCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  assignSalesRep,
} from "../controllers/customerController.js";

import {authenticate } from "../middlewares/authMiddleware.js"
import { isAdmin } from "../middlewares/authRoles.js"
// Adjust middleware import based on your setup

const router = express.Router();

// 📌 Create new customer (with file upload support)
router.post("/", authenticate, createCustomer);

// 📌 Get all customers
router.get("/", authenticate, getCustomers);

// 📌 Approve a customer (Admin only)
router.put("/approve/:id", authenticate, isAdmin, approveCustomer);

// 📌 Update customer & upload new files if available
router.put("/:id", authenticate, updateCustomer);

// 📌 Delete a customer
router.delete("/:id", authenticate, isAdmin, deleteCustomer);

// 📌 Assign Sales Rep
router.put("/assign-sales-rep", authenticate, isAdmin, assignSalesRep);

export default router;
