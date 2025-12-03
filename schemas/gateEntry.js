// models/gateEntry.js
import mongoose from 'mongoose';

const gateEntrySchema = new mongoose.Schema({
  // Entry Type
  entryType: {
    type: String,
    enum: ['Incoming Shipment', 'Outgoing Shipment', 'Visitor'],
    required: true
  },

  // Shipment Details (for Incoming/Outgoing)
  shipmentDetails: {
    supplierName: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
    truckPlateNumber: { type: String },
    productType: { type: String },
    numberOfBags: { type: Number },
    origin: { type: String },
    notes: { type: String }
  },

  // Visitor Details (for Visitor type)
  visitorDetails: {
    visitorName: { type: String },
    phoneNumber: { type: String },
    visitingWho: { type: String },
    purposeOfVisit: { type: String },
    timeIn: { type: String },
    timeOut: { type: String }
  },

  // Status Tracking
  status: {
    type: String,
    enum: ['At Gate', 'In QC', 'In Lab', 'In Weighbridge', 'Approved', 'Rejected', 'Completed'],
    default: 'At Gate'
  },

  // QC Information (populated later)
  qcStatus: {
    type: String,
    enum: ['Pending', 'Passed', 'Failed'],
    default: 'Pending'
  },
  qcInspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qcInspectedAt: Date,
  qcRemarks: { type: String },

  // Lab Information (populated later)
  labStatus: {
    type: String,
    enum: ['Pending', 'Passed', 'Failed'],
    default: 'Pending'
  },
  labAnalyzedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  labAnalyzedAt: Date,
  labRemarks: { type: String },

  // Weighbridge Information (populated later)
  weighbridgeData: {
    grossWeight: { type: Number },
    tareWeight: { type: Number },
    netWeight: { type: Number },
    weighedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    weighedAt: Date
  },

  // Audit Fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  
  // Timestamps
  entryTime: { type: Date, default: Date.now },
  exitTime: Date

}, {
  timestamps: true
});

// Index for faster queries
gateEntrySchema.index({ entryType: 1, status: 1, createdAt: -1 });
gateEntrySchema.index({ 'shipmentDetails.truckPlateNumber': 1 });

const GateEntry = mongoose.model('GateEntry', gateEntrySchema);
export default GateEntry;