// routes/notificationRoute.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';  // We'll create this next

const router = express.Router();

router.use(authenticate);  // Protect all routes

router.get('/', getUserNotifications);  // GET /api/notifications → user's notifications
router.patch('/:id/read', markNotificationAsRead);  // PATCH /api/notifications/:id/read → mark one as read
router.patch('/read-all', markAllAsRead);  // PATCH /api/notifications/read-all → mark all as read

export default router;