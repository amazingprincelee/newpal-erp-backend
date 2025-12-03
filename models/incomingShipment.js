// models/IncomingShipment.js
import mongoose from 'mongoose';

const incomingShipmentSchema = new mongoose.Schema({
  // === AUTO-GENERATED UNIQUE ID ===
  shipmentNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    // e.g., IS-2025-000487
  },

  

  // === GATE ENTRY (Security at Gate) ===
  gateEntry: {
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enteredAt: { type: Date, default: Date.now },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    driverName: { type: String, required: true },
    driverPhone: { type: String, required: true },
    truckPlateNumber: { type: String, required: true, uppercase: true },
    waybillNumber: String,
    declaredBags: { type: Number, required: true, min: 1 },
    productType: { type: String, required: true }, // e.g., "Yellow Maize"
    origin: { type: String, required: true },
    securityBagCount: { type: Number },           // ← Security man counts at gate
    bagCountMatch: { type: Boolean },             // ← Does it match declared?
    notes: String
  },

  // === QUALITY CONTROL (QC Team) ===
  qualityControl: {
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: Date,
    visualAppearance: { type: String, enum: ['Good', 'Fair', 'Poor'] },
    moistureContent: Number,        // %
    foreignMatter: Number,          // %
    damagedGrains: Number,          // %
    color: String,
    odor: { type: String, enum: ['Normal', 'Musty', 'Foul'] },
    notes: String,
    images: [String],               // photos of grains
    status: { type: String, enum: ['PASSED', 'FAILED', 'SENT_TO_LAB'], default: 'PENDING' },
    sendToLab: { type: Boolean, default: false }
  },

  // === LAB ANALYSIS (if sent to lab) ===
  labAnalysis: {
    sampleId: String,
    analyzedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    analyzedAt: Date,
    aflatoxin: Number,
    heavyMetals: { lead: Number, cadmium: Number, mercury: Number },
    salmonella: { type: String, enum: ['Detected', 'Not Detected'] },
    eColi: { type: String, enum: ['Detected', 'Not Detected'] },
    notes: String,
    reportUrl: String,
    status: { type: String, enum: ['PASSED', 'FAILED'] }
  },

  // === WEIGHBRIDGE ===
  weighbridge: {
    weighedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    weighedAt: Date,
    grossWeight: Number,
    tareWeight: Number,
    netWeight: { type: Number, default: 0 },
    calculatedBags: { type: Number },           // netWeight / 50
    weightPerBag: { type: Number, default: 50 },
    discrepancyBags: Number,
    discrepancyPercent: Number,
    notes: String,
    ticketUrl: String
  },

  // === MD / ADMIN APPROVAL (Final Gatekeeper) ===
  adminApproval: {
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    requestedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectionReason: String,
    notes: String
  },

  // === OFFLOADING & FINAL COUNT ===
  offloading: {
    offloadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    offloadedAt: Date,
    startTime: Date,
    endTime: Date,
    actualBagsCounted: Number,           // Final count inside warehouse
    storageLocation: String,
    condition: { type: String, enum: ['Good', 'Damaged', 'Wet'] },
    damageReport: String,
    notes: String,
    completed: { type: Boolean, default: false },
    inventoryUpdated: { type: Boolean, default: false }
  },

  // === CURRENT STATUS (Single Source of Truth) ===
  currentStatus: {
    type: String,
    enum: [
      'AT_GATE',
      'SECURITY_COUNTED',
      'IN_QC',
      'IN_LAB',
      'AT_WEIGHBRIDGE',
      'PENDING_MD_APPROVAL',
      'APPROVED',
      'REJECTED',
      'OFFLOADING',
      'COMPLETED'
    ],
    default: 'AT_GATE'
  },

  // === AUDIT TRAIL ===
  statusHistory: [{
    status: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    notes: String
  }]

}, { timestamps: true });

// === AUTO-CALCULATIONS ===
incomingShipmentSchema.pre('save', function(next) {
  const doc = this;

  // Net weight
  if (doc.weighbridge?.grossWeight && doc.weighbridge?.tareWeight) {
    doc.weighbridge.netWeight = doc.weighbridge.grossWeight - doc.weighbridge.tareWeight;
    doc.weighbridge.calculatedBags = Math.floor(doc.weighbridge.netWeight / doc.weighbridge.weightPerBag);
    doc.weighbridge.discrepancyBags = doc.weighbridge.calculatedBags - doc.gateEntry.declaredBags;
    doc.weighbridge.discrepancyPercent = doc.gateEntry.declaredBags > 0
      ? (doc.weighbridge.discrepancyBags / doc.gateEntry.declaredBags) * 100
      : 0;
  }

  // Status history
  if (doc.isModified('currentStatus')) {
    doc.statusHistory.push({
      status: doc.currentStatus,
      changedAt: new Date()
    });
  }

  next();
});

// Indexes
incomingShipmentSchema.index({ shipmentNumber: 1 });
incomingShipmentSchema.index({ currentStatus: 1 });
incomingShipmentSchema.index({ 'gateEntry.vendor': 1 });
incomingShipmentSchema.index({ 'adminApproval.status': 1 });
incomingShipmentSchema.index({ createdAt: -1 });


const IncomingShipment   = mongoose.model('IncomingShipment', incomingShipmentSchema);
export default IncomingShipment