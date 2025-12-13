// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Recipient user
  title: { type: String, required: true },  // e.g., "New Shipment Approval Needed"
  message: { type: String, required: true },  // Detailed body
  type: { 
    type: String, 
    enum: ['approval', 'rejection', 'qc', 'lab', 'offload', 'exit', 'other'], 
    default: 'other' 
  },  // For filtering/icons
  link: { type: String },  // Optional: URL to view (e.g., /shipment/:id)
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ user: 1, createdAt: -1 });  // For fast user-specific queries

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;