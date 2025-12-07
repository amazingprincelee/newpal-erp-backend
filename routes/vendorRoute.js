// routes/vendorRoutes.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAdmin, isSuperAdmin, isAdminOrProcurement } from '../middlewares/authRoles.js';
import {
  createVendor,
  approveVendor,
  getVendors,
  updateVendor,
  deleteVendor
} from '../controllers/vendorController.js';

const router = express.Router();

// CREATE VENDOR - Procurement can create
router.post('/', authenticate, isAdminOrProcurement, createVendor);

// GET ALL VENDORS - All authenticated users can view
router.get('/', authenticate, getVendors);

// APPROVE VENDOR - Only SuperAdmin can approve
router.patch('/:id/approve', authenticate, isSuperAdmin, approveVendor);

// UPDATE VENDOR - Only SuperAdmin can edit
router.patch('/:id', authenticate, isSuperAdmin, updateVendor);

// DELETE VENDOR - Only SuperAdmin can delete
router.delete('/:id', authenticate, isSuperAdmin, deleteVendor);

export default router;