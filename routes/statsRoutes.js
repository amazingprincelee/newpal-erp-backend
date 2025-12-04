// routes/statsRoutes.js
import express from "express"
import { 
  getAdminDashboardStats, 
  getGateDashboardStats,
  getQADashboardStats,
  getDispatchDashboardStats,
  getWeighbridgeDashboardStats,
  getLabDashboardStats,
  getSalesDashboardStats,
  getProcurementDashboardStats
} from '../controllers/statsControllers.js';
import { authenticate } from "../middlewares/authMiddleware.js"
const router = express.Router()

router.get('/admin', authenticate, getAdminDashboardStats);
router.get('/gate', authenticate, getGateDashboardStats);
router.get('/qa', authenticate, getQADashboardStats);
router.get('/dispatch', authenticate, getDispatchDashboardStats);
router.get('/weighbridge', authenticate, getWeighbridgeDashboardStats);
router.get('/lab', authenticate, getLabDashboardStats);
router.get('/sales', authenticate, getSalesDashboardStats);
router.get('/procurement', authenticate, getProcurementDashboardStats);



export default router;