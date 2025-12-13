// controllers/notificationController.js
import Notification from '../models/notification.js';
import { sendNotificationEmail } from '../utils/node-mailer.js';  // We'll enhance this

// Helper: Create and send notification (call this from other controllers)
export const createNotification = async ({ userId, title, message, type, link }) => {
  try {
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      link,
    });
    await notification.save();

    // Send email (async, non-blocking)
    sendNotificationEmail({
      to: (await User.findById(userId)).email,
      subject: title,
      message,
    });

    // Optional SMS (Twilio placeholder – install 'twilio' if needed)
    // const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // client.messages.create({
    //   body: `${title}: ${message.slice(0, 100)}...`,
    //   from: process.env.TWILIO_PHONE,
    //   to: userPhone,
    // });

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error);
  }
};

// GET user's notifications (unread first)
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ isRead: 1, createdAt: -1 })  // Unread first, then newest
      .limit(50);  // Prevent overload
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

// Mark one as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};