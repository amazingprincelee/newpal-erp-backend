// routes/weighbridgeRoute.js
import express from 'express';
import {
  getShipmentsAwaitingWeighing,
  getShipmentForWeighing,
  submitWeighbridgeData,
  getTodayStatistics,
  getActiveWeighing,
  startWeighing
} from '../controllers/WeighbridgeController.js';
import { authenticate  } from '../middlewares/authMiddleware.js'; 

const router = express.Router();


router.use(authenticate);

// GET /api/weighbridge/awaiting - Get all shipments ready for weighing
router.get('/awaiting', getShipmentsAwaitingWeighing);

// GET /api/weighbridge/active - Get current active weighing
router.get('/active', getActiveWeighing);

// GET /api/weighbridge/statistics - Get today's statistics
router.get('/statistics', getTodayStatistics);

// GET /api/weighbridge/:id - Get specific shipment for weighing
router.get('/:id', getShipmentForWeighing);

// POST /api/weighbridge/:id/start - Start weighing a shipment
router.post('/:id/start', startWeighing);

// POST /api/weighbridge/:id/submit - Submit weighbridge data
router.post('/:id/submit', submitWeighbridgeData);

export default router;