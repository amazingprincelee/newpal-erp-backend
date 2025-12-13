// utils/notificationHelper.js   ← NEW FILE (create this)
import Notification from '../models/notification.js';
import User from '../models/user.js';
import { sendNotificationEmail } from './node-mailer.js';  // Your existing email file

/**
 * Reusable function: Create notification + send email
 * Call this from ANY controller when something important happens
 */
export const createNotification = async ({
  userId,
  title,
  message,
  type = 'other',
  link = null,
}) => {
  try {
    // 1. Create in-app notification
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      link,
    });
    await notification.save();

    // 2. Send email (fire and forget – doesn't block the main flow)
    const user = await User.findById(userId).select('email fullname');
    if (user?.email) {
      sendNotificationEmail({
        to: user.email,
        subject: `Newpal Alert: ${title}`,
        message: `
          <h3>Hello ${user.fullname},</h3>
          <p><strong>${title}</strong></p>
          <p>${message}</p>
          ${link ? `<p><a href="${process.env.FRONTEND_URL}${link}" style="color:#800000; font-weight:bold;">→ View Details</a></p>` : ''}
          <hr>
          <small>This is an automated message from Newpal System.</small>
        `,
      }).catch(err => console.log('Email failed (non-blocking):', err));
    }

    console.log(`Notification created for user ${userId}: ${title}`);
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw — never break the main workflow because of notifications
  }
};