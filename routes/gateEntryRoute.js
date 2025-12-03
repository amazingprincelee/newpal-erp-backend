// routes/incomingShipmentRoute.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { hasRole } from '../middlewares/authRoles.js';
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
} from '../controllers/incomingShipmentController.js';

const router = express.Router();

// CREATE - Security/Gate can create
router.post('/', 
  authenticate, 
  hasRole('super-admin', 'admin', 'security'), 
  createIncomingShipment
);

// GET ALL
router.get('/', 
  authenticate, 
  getIncomingShipments
);

// GET STATS
router.get('/stats', 
  authenticate, 
  getIncomingStats
);

// GET BY ID
router.get('/:id', 
  authenticate, 
  getIncomingShipmentById
);

// UPDATE SECURITY COUNT
router.patch('/:id/security-count', 
  authenticate, 
  hasRole('super-admin', 'admin', 'security'), 
  updateSecurityCount
);

// UPDATE QC
router.patch('/:id/qc', 
  authenticate, 
  hasRole('super-admin', 'admin', 'qc'), 
  updateQCInspection
);

// UPDATE LAB
router.patch('/:id/lab', 
  authenticate, 
  hasRole('super-admin', 'admin', 'lab'), 
  updateLabAnalysis
);

// UPDATE WEIGHBRIDGE
router.patch('/:id/weighbridge', 
  authenticate, 
  hasRole('super-admin', 'admin', 'weighbridge'), 
  updateWeighbridge
);

// MD APPROVAL
router.patch('/:id/md-approval', 
  authenticate, 
  hasRole('super-admin'), 
  updateMDApproval
);

// UPDATE OFFLOADING
router.patch('/:id/offloading', 
  authenticate, 
  hasRole('super-admin', 'admin', 'warehouse'), 
  updateOffloading
);

// DELETE
router.delete('/:id', 
  authenticate, 
  hasRole('super-admin'), 
  deleteIncomingShipment
);

export default router;

