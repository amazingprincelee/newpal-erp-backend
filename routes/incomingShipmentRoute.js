// routes/incomingShipmentRoute.js - REFACTORED FOR NEW WORKFLOW
import express from 'express';
import {
  // STAGE 1: Gate Entry
  createIncomingShipment,
  
  // STAGE 2: MD Approval #1
  updateMDGateApproval,
  
  // STAGE 3: QC Inspection
  updateQCInspection,
  
  // STAGE 4: Lab Analysis
  updateLabAnalysis,
  
  // STAGE 5: Weighbridge Gross
  updateWeighbridgeGross,
  
  // STAGE 6: MD Approval #2
  updateMDPreOffloadApproval,
  
  // STAGE 7: Offload Reports (3 departments)
  submitQCStockKeeperReport,
  submitWarehouseReport,
  submitSecurityReport,
  
  // STAGE 8: Weighbridge Tare
  updateWeighbridgeTare,
  
  // STAGE 9: MD Approval #3
  updateMDFinalExitApproval,
  
  // STAGE 10: Gate Exit
  processGateExit,
  
  // Helper endpoints
  getIncomingShipments,
  getIncomingShipmentById,
  getPreOffloadReport,
  getFinalExitReport,
  deleteIncomingShipment,
  getIncomingStats
} from '../controllers/incommingShipmentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/authRoles.js';

const router = express.Router();

// ========== STATS & LISTS ==========
router.get('/stats', authenticate, getIncomingStats);
router.get('/', authenticate, getIncomingShipments);
router.get('/:id', authenticate, getIncomingShipmentById);

// ========== CONSOLIDATED REPORTS ==========
router.get('/:id/pre-offload-report', authenticate, getPreOffloadReport);
router.get('/:id/final-exit-report', authenticate, getFinalExitReport);

// ========== STAGE 1: GATE ENTRY ==========
router.post('/', authenticate, createIncomingShipment);

// ========== STAGE 2: MD APPROVAL #1 (Gate Entry Approval) ==========
router.patch('/:id/md-gate-approval', authenticate, isAdmin, updateMDGateApproval);

// ========== STAGE 3: QC INSPECTION ==========
router.patch('/:id/qc-inspection', authenticate, updateQCInspection);

// ========== STAGE 4: LAB ANALYSIS ==========
router.patch('/:id/lab-analysis', authenticate, updateLabAnalysis);

// ========== STAGE 5: WEIGHBRIDGE GROSS ==========
router.patch('/:id/weighbridge-gross', authenticate, updateWeighbridgeGross);

// ========== STAGE 6: MD APPROVAL #2 (Pre-Offload Approval) ==========
router.patch('/:id/md-pre-offload-approval', authenticate, isAdmin, updateMDPreOffloadApproval);

// ========== STAGE 7: OFFLOAD REPORTS (3 Departments) ==========
router.patch('/:id/offload-qc-stockkeeper', authenticate, submitQCStockKeeperReport);
router.patch('/:id/offload-warehouse', authenticate, submitWarehouseReport);
router.patch('/:id/offload-security', authenticate, submitSecurityReport);

// ========== STAGE 8: WEIGHBRIDGE TARE ==========
router.patch('/:id/weighbridge-tare', authenticate, updateWeighbridgeTare);

// ========== STAGE 9: MD APPROVAL #3 (Final Exit Approval) ==========
router.patch('/:id/md-final-exit-approval', authenticate, isAdmin, updateMDFinalExitApproval);

// ========== STAGE 10: GATE EXIT ==========
router.patch('/:id/gate-exit', authenticate, processGateExit);

// ========== DELETE ==========
router.delete('/:id', authenticate, isAdmin, deleteIncomingShipment);

export default router;