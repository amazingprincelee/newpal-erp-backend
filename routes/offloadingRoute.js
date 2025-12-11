// routes/offloadingRoute.js - UPDATED FOR 3 DEPARTMENT REPORTS
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';

import {
  getShipmentsReadyForOffloading,
  getShipmentsInOffloading,
  startOffloading,
  submitQCStockKeeperReport,
  submitWarehouseReport,
  submitSecurityReport,
  getOffloadingStatistics,
  getShipmentsAwaitingTareWeight
} from '../controllers/offloadingController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/ready', getShipmentsReadyForOffloading);
router.get('/in-progress', getShipmentsInOffloading);
router.get('/awaiting-tare', getShipmentsAwaitingTareWeight);
router.get('/statistics', getOffloadingStatistics);

// POST routes
router.post('/:id/start', startOffloading);
router.post('/:id/qc-stock-keeper', submitQCStockKeeperReport);
router.post('/:id/warehouse', submitWarehouseReport);
router.post('/:id/security', submitSecurityReport);

export default router;