// routes/outgoingShipmentRoute.js - REFACTORED FOR NEW WORKFLOW
import express from 'express';
import {
  // STAGE 1: Gate Entry (Empty Truck)
  createOutgoingShipment,
  
  // STAGE 2: MD Approval #1
  updateMDGateApproval,
  
  // STAGE 3: Weighbridge Tare
  updateWeighbridgeTare,
  
  // STAGE 4: QC Pre-Loading
  updateQCPreLoading,
  
  // STAGE 5: Warehouse Loading
  submitWarehouseLoading,
  
  // STAGE 5B: QC Post-Loading
  updateQCPostLoading,
  
  // STAGE 6: Weighbridge Gross
  updateWeighbridgeGross,
  
  // STAGE 7: MD Approval #2
  updateMDFinalExitApproval,
  
  // STAGE 8: Gate Exit
  processGateExit,
  
  // Helper endpoints
  getOutgoingShipments,
  getOutgoingShipmentById,
  getFinalExitReport,
  deleteOutgoingShipment,
  getOutgoingStats
} from '../controllers/outgoingShipmentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/authRoles.js';

const router = express.Router();

// ========== STATS & LISTS ==========
router.get('/stats', authenticate, getOutgoingStats);
router.get('/', authenticate, getOutgoingShipments);
router.get('/:id', authenticate, getOutgoingShipmentById);

// ========== CONSOLIDATED REPORTS ==========
router.get('/:id/final-exit-report', authenticate, getFinalExitReport);

// ========== STAGE 1: GATE ENTRY (Empty Truck Entry) ==========
router.post('/', authenticate, createOutgoingShipment);

// ========== STAGE 2: MD APPROVAL #1 (Gate Entry Approval) ==========
router.patch('/:id/md-gate-approval', authenticate, isAdmin, updateMDGateApproval);

// ========== STAGE 3: WEIGHBRIDGE TARE (Empty Truck) ==========
router.patch('/:id/weighbridge-tare', authenticate, updateWeighbridgeTare);

// ========== STAGE 4: QC PRE-LOADING INSPECTION ==========
router.patch('/:id/qc-pre-loading', authenticate, updateQCPreLoading);

// ========== STAGE 5: WAREHOUSE LOADING ==========
router.patch('/:id/warehouse-loading', authenticate, submitWarehouseLoading);

// ========== STAGE 5B: QC POST-LOADING VERIFICATION ==========
router.patch('/:id/qc-post-loading', authenticate, updateQCPostLoading);

// ========== STAGE 6: WEIGHBRIDGE GROSS (Full Truck) ==========
router.patch('/:id/weighbridge-gross', authenticate, updateWeighbridgeGross);

// ========== STAGE 7: MD APPROVAL #2 (Final Exit Approval) ==========
router.patch('/:id/md-final-exit-approval', authenticate, isAdmin, updateMDFinalExitApproval);

// ========== STAGE 8: GATE EXIT ==========
router.patch('/:id/gate-exit', authenticate, processGateExit);

// ========== DELETE ==========
router.delete('/:id', authenticate, isAdmin, deleteOutgoingShipment);

export default router;