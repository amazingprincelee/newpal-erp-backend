// routes/weighbridgeRoute.js - UPDATED TO MATCH NEW WORKFLOW
import express from 'express';
import {
  getShipmentsAwaitingGrossWeight,
  getShipmentsAwaitingTareWeight,
  getShipmentForWeighing,
  submitGrossWeight,
  submitTareWeight,
  startGrossWeighing,
  startTareWeighing,
  getTodayStatistics,
  getActiveWeighing
} from '../controllers/WeighbridgeController.js';
import { authenticate } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

// Protect all routes
router.use(authenticate);

// ========== STAGE 5: GROSS WEIGHT ROUTES ==========
// GET /api/weighbridge/awaiting-gross - Get all shipments ready for gross weighing (with load)
router.get('/awaiting-gross', getShipmentsAwaitingGrossWeight);

// POST /api/weighbridge/:id/start-gross - Start gross weighing
router.post('/:id/start-gross', startGrossWeighing);

// POST /api/weighbridge/:id/submit-gross - Submit gross weight
router.post('/:id/submit-gross', submitGrossWeight);

// ========== STAGE 8: TARE WEIGHT ROUTES ==========
// GET /api/weighbridge/awaiting-tare - Get all shipments ready for tare weighing (empty)
router.get('/awaiting-tare', getShipmentsAwaitingTareWeight);

// POST /api/weighbridge/:id/start-tare - Start tare weighing
router.post('/:id/start-tare', startTareWeighing);

// POST /api/weighbridge/:id/submit-tare - Submit tare weight
router.post('/:id/submit-tare', submitTareWeight);

// ========== COMMON ROUTES ==========
// GET /api/weighbridge/active - Get current active weighing (gross or tare)
router.get('/active', getActiveWeighing);

// GET /api/weighbridge/statistics - Get today's statistics
router.get('/statistics', getTodayStatistics);

// GET /api/weighbridge/:id - Get specific shipment for weighing
router.get('/:id', getShipmentForWeighing);

export default router;