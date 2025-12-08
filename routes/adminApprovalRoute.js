// routes/adminApprovalRoute.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/authRoles.js'
import {
  getIncomingPendingApproval,
  getIncomingShipmentForApproval,
  approveIncomingShipment,
  rejectIncomingShipment,
  getOutgoingPendingApproval,
  getOutgoingShipmentForApproval,
  approveOutgoingShipment,
  rejectOutgoingShipment,
  getMDStatistics
} from '../controllers/adminApprovalController.js';

const router = express.Router();

// All routes require authentication and super-admin role
router.use(authenticate);


// ==================== INCOMING SHIPMENTS ====================
// GET all incoming shipments pending approval
router.get('/incoming/pending', isAdmin, getIncomingPendingApproval);

// GET single incoming shipment for approval review
router.get('/incoming/:id', isAdmin, getIncomingShipmentForApproval);

// POST approve incoming shipment
router.post('/incoming/:id/approve', isAdmin, approveIncomingShipment);

// POST reject incoming shipment
router.post('/incoming/:id/reject', isAdmin, rejectIncomingShipment);

// ==================== OUTGOING SHIPMENTS ====================
// GET all outgoing shipments pending approval
router.get('/outgoing/pending',isAdmin, getOutgoingPendingApproval);

// GET single outgoing shipment for approval review
router.get('/outgoing/:id', isAdmin, getOutgoingShipmentForApproval);

// POST approve outgoing shipment
router.post('/outgoing/:id/approve', isAdmin, approveOutgoingShipment);

// POST reject outgoing shipment
router.post('/outgoing/:id/reject', isAdmin, rejectOutgoingShipment);

// ==================== STATISTICS ====================
// GET MD dashboard statistics
router.get('/statistics', isAdmin, getMDStatistics);

export default router;