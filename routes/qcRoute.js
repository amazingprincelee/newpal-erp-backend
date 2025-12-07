// routes/qcRoute.js
import express from 'express';
import {
  getShipmentsPendingQC,
  getShipmentForQC,
  getActiveQCInspection,
  startQCInspection,
  submitQCPass,
  submitQCSendToLab,
  submitQCReject,
  getQCStatistics
} from '../controllers/qcController.js';
import { authenticate } from '../middlewares/authMiddleware.js'; // Adjust path as needed

const router = express.Router();

// All routes are protected (require authentication)
router.use(authenticate);

// GET /api/qc/pending - Get all shipments pending QC inspection
router.get('/pending', getShipmentsPendingQC);

// GET /api/qc/active - Get current active QC inspection
router.get('/active', getActiveQCInspection);

// GET /api/qc/statistics - Get today's QC statistics
router.get('/statistics', getQCStatistics);

// GET /api/qc/:id - Get specific shipment for QC inspection
router.get('/:id', getShipmentForQC);

// POST /api/qc/:id/start - Start QC inspection
router.post('/:id/start', startQCInspection);

// POST /api/qc/:id/pass - Submit QC inspection as PASSED
router.post('/:id/pass', submitQCPass);

// POST /api/qc/:id/send-to-lab - Send shipment to lab
router.post('/:id/send-to-lab', submitQCSendToLab);

// POST /api/qc/:id/reject - Reject shipment
router.post('/:id/reject', submitQCReject);

export default router;