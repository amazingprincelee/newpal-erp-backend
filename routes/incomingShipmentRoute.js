// routes/incomingShipmentRoute.js
import express from 'express';
import {
  createIncomingShipment,
  getIncomingShipments,
  getIncomingShipmentById,
  updateSecurityCount,
  updateQCInspection,
  updateLabAnalysis,
  updateWeighbridge,
  updateMDApproval,
  updateOffloading,
  deleteIncomingShipment,
  getIncomingStats
} from '../controllers/incommingShipmentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/authRoles.js';

const router = express.Router();

// Stats endpoint (must be before /:id routes)
router.get('/stats', authenticate, getIncomingStats);

// Create new incoming shipment
router.post('/', authenticate, createIncomingShipment);

// Get all incoming shipments
router.get('/', authenticate, getIncomingShipments);

// Get single incoming shipment
router.get('/:id', authenticate, getIncomingShipmentById);

// Update security count
router.patch('/:id/security-count', authenticate, updateSecurityCount);

// Update QC inspection
router.patch('/:id/qc', authenticate, updateQCInspection);

// Update lab analysis
router.patch('/:id/lab', authenticate, updateLabAnalysis);

// Update weighbridge
router.patch('/:id/weighbridge', authenticate, updateWeighbridge);

// MD Approval (Admin only)
router.patch('/:id/md-approval', authenticate, isAdmin, updateMDApproval);

// Update offloading
router.patch('/:id/offloading', authenticate, updateOffloading);

// Delete incoming shipment (Admin only)
router.delete('/:id', authenticate, isAdmin, deleteIncomingShipment);

export default router;