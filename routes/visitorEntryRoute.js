// ========================================
// routes/visitorEntryRoute.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  createVisitorEntry,
  getVisitorEntries,
  getVisitorEntryById,
  approveVisitorEntry,
  printVisitorPass,
  recordVisitorExit,
  cancelVisitorEntry,
  deleteVisitorEntry,
  getVisitorStats
} from '../controllers/visitorEntryController.js';

const router = express.Router();

// CREATE - Security can create
router.post('/', 
  authenticate, 
  createVisitorEntry
);

// GET ALL
router.get('/', 
  authenticate, 
  getVisitorEntries
);

// GET STATS
router.get('/stats', 
  authenticate, 
  getVisitorStats
);

// GET BY ID
router.get('/:id', 
  authenticate, 
  getVisitorEntryById
);

// APPROVE
router.patch('/:id/approve', 
  authenticate, 
  approveVisitorEntry
);

// PRINT PASS
router.post('/:id/print-pass', 
  authenticate, 
  printVisitorPass
);

// RECORD EXIT
router.patch('/:id/exit', 
  authenticate,  
  recordVisitorExit
);

// CANCEL
router.patch('/:id/cancel', 
  authenticate,  
  cancelVisitorEntry
);

// DELETE
router.delete('/:id', 
  authenticate, 
  deleteVisitorEntry
);

export default router;