

// ========================================
// routes/outgoingShipmentRoute.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  createOutgoingShipment,
  getOutgoingShipments,
  getOutgoingShipmentById,
  updateMDApproval,
  startLoading,
  completeLoading,
  updateGateOutVerification,
  gateOut,
  markInTransit,
  markDelivered,
  deleteOutgoingShipment,
  getOutgoingStats
} from '../controllers/outgoingShipmentController.js';

const routerOut = express.Router();

// CREATE - Sales/Dispatch can create
routerOut.post('/', 
  authenticate, 
  createOutgoingShipment
);

// GET ALL
routerOut.get('/', 
  authenticate, 
  getOutgoingShipments
);

// GET STATS
routerOut.get('/stats', 
  authenticate, 
  getOutgoingStats
);

// GET BY ID
routerOut.get('/:id', 
  authenticate, 
  getOutgoingShipmentById
);

// MD APPROVAL
routerOut.patch('/:id/md-approval', 
  authenticate,  
  updateMDApproval
);

// START LOADING
routerOut.patch('/:id/start-loading', 
  authenticate,  
  startLoading
);

// COMPLETE LOADING
routerOut.patch('/:id/complete-loading', 
  authenticate, 
  completeLoading
);

// GATE OUT VERIFICATION
routerOut.patch('/:id/gate-out-verification', 
  authenticate, 
  updateGateOutVerification
);

// GATE OUT
routerOut.patch('/:id/gate-out', 
  authenticate, 
  gateOut
);

// IN TRANSIT
routerOut.patch('/:id/in-transit', 
  authenticate, 
  markInTransit
);

// DELIVERED
routerOut.patch('/:id/delivered', 
  authenticate, 
  markDelivered
);

// DELETE
routerOut.delete('/:id', 
  authenticate, 
  deleteOutgoingShipment
);

export default routerOut;

