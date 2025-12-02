// routes/vendorRoutes.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAdmin, isSuperAdmin, isProcurement } from '../middlewares/authRoles.js'
import {
  createVendor,
  approveVendor,
  getVendors,
  updateVendor,
  deleteVendor
} from '../controllers/vendorController.js';

const router = express.Router();

// --- CREATE VENDOR ---
router.post('/', authenticate, isProcurement, createVendor);

// --- GET ALL VENDORS ---
router.get('/', authenticate, isProcurement, isAdmin, getVendors);

// --- APPROVE VENDOR ---
router.patch('/:id/approve', authenticate, isSuperAdmin, approveVendor);

// --- UPDATE VENDOR (PATCH is preferred for partial updates) ---
router.patch('/:id', authenticate, isSuperAdmin, updateVendor);



// ... existing routes
router.delete('/:id', authenticate, isSuperAdmin, deleteVendor);

export default router;
