// routes/offloadingRoute.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';

import {
  getShipmentsReadyForOffloading,
  getShipmentsInOffloading,
  getShipmentsPendingApproval,
  startOffloading,
  completeOffloading,
  getCompletedShipments,
  getOffloadingStatistics
} from '../controllers/offloadingController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET routes - accessible by warehouse/inventory staff
router.get('/ready', 
  
  getShipmentsReadyForOffloading
);

router.get('/in-progress', 
  
  getShipmentsInOffloading
);

router.get('/pending-approval', 
  
  getShipmentsPendingApproval
);

router.get('/completed', 
   
  getCompletedShipments
);

router.get('/statistics', 
  
  getOffloadingStatistics
);

// POST routes - start and complete offloading
router.post('/:id/start', 
  
  startOffloading
);

router.post('/:id/complete', 
  
  completeOffloading
);

export default router;