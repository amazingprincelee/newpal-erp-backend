import express from 'express';
import {
  getSamplesPendingAnalysis,
  getSampleForAnalysis,
  getActiveAnalysis,
  submitMicrobiologicalAnalysis,
  submitChemicalAnalysis,
  getRecentLabReports,
  getLabStatistics,
  uploadLabReport
} from '../controllers/labController.js';
import { authenticate } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

// Protect all routes (assuming authentication is required)
router.use(authenticate);

// GET routes
router.get('/samples/pending', getSamplesPendingAnalysis);
router.get('/samples/:id', getSampleForAnalysis);
router.get('/active', getActiveAnalysis);
router.get('/reports/recent', getRecentLabReports);
router.get('/statistics', getLabStatistics);

// POST routes
router.post('/upload-report', uploadLabReport);
router.post('/samples/:id/microbiological', submitMicrobiologicalAnalysis);
router.post('/samples/:id/chemical', submitChemicalAnalysis);

export default router;