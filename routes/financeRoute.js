// routes/financeRoute.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  getFinanceStats,
  createWithdrawalRequest,
  initiateWithdrawalTransfer,
  finalizeWithdrawalWithOTP,
  uploadProof
} from '../controllers/financeController.js';
import fileUpload from 'express-fileupload';

const router = express.Router();
router.use(authenticate);
router.use(fileUpload());

router.get('/stats', getFinanceStats);
router.post('/withdrawals', createWithdrawalRequest);
router.post('/withdrawals/:id/initiate', initiateWithdrawalTransfer);
router.post('/withdrawals/:id/finalize-otp', finalizeWithdrawalWithOTP);
router.post('/withdrawals/:id/upload-proof', uploadProof);

export default router;