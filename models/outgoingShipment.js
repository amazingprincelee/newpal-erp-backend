// models/OutgoingShipment.js  ← FINAL WITH GATE OUT SECURITY
import mongoose from 'mongoose';

const outgoingShipmentSchema = new mongoose.Schema({
  //shipmentNumber: { type: String, required: true, unique: true, uppercase: true },

  releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  releasedAt: { type: Date, default: Date.now },

  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },

  driverName: { type: String, required: true },
  driverPhone: { type: String, required: true },
  truckPlateNumber: { type: String, required: true, uppercase: true },

  items: [{
    product: { type: String, required: true },
    batchNo: { type: String, required: true },
    quantityBags: { type: Number, required: true, min: 1 },
    unitWeight: { type: Number, default: 50 },
    totalWeight: { type: Number }
  }],

  totalBags: { type: Number, required: true },
  totalWeight: { type: Number, required: true },
  destination: { type: String, required: true },

  // === MD APPROVAL ===
  mdApproval: {
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    requestedAt: { type: Date, default: Date.now },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectionReason: String,
    notes: String
  },

  // === GATE OUT (SECURITY VERIFICATION) ← THIS IS THE MISSING PIECE ===
  gateOut: {
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },        // Security officer
    verifiedAt: Date,
    bagsCounted: { type: Number },                                            // Security re-counts
    countMatch: { type: Boolean },                                            // Matches loaded bags?
    truckCondition: { type: String, enum: ['Good', 'Damaged', 'Seal Broken'] },
    sealNumber: String,                                                       // Tamper-proof seal
    securityNotes: String,
    securitySignature: String,                                                // Photo or base64
    images: [String]                                                          // Truck photos before exit
  },

  // === DOCUMENTS ===
  deliveryNoteNumber: { type: String, unique: true, sparse: true },
  waybillNumber: { type: String, unique: true, sparse: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },

  // === STATUS ===
  status: {
    type: String,
    enum: [
      'Draft',
      'Pending MD Approval',
      'MD Approved',
      'Loading',
      'Loaded',
      'Gate Out Verification',   // ← New step
      'Gate Out',                // ← Truck left
      'In Transit',
      'Delivered',
      'Returned',
      'Short-Landed'
    ],
    default: 'Draft'
  },

  loadingStartedAt: Date,
  loadedAt: Date,
  gateOutVerifiedAt: Date,    // When security counted
  gateOutAt: Date,            // When truck actually left
  deliveredAt: Date,

  loadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gateOutVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gateOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  actualBagsReceived: Number,
  shortLandedBags: Number,
  issues: String,
  proofOfDelivery: [String],
  customerSignature: String,

  notes: String,
  internalNotes: String,

}, { timestamps: true });

// AUTO-CALCULATIONS & LOGIC
outgoingShipmentSchema.pre('save', function(next) {
  const doc = this;

  // Totals
  if (doc.items?.length > 0) {
    doc.totalBags = doc.items.reduce((s, i) => s + i.quantityBags, 0);
    doc.totalWeight = doc.items.reduce((s, i) => s + (i.quantityBags * i.unitWeight), 0);
    doc.items.forEach(i => i.totalWeight = i.quantityBags * i.unitWeight);
  }

  // Short-landed
  if (doc.actualBagsReceived != null) {
    doc.shortLandedBags = doc.totalBags - doc.actualBagsReceived;
  }

  // Auto bag count match at gate
  if (doc.gateOut?.bagsCounted != null) {
    doc.gateOut.countMatch = doc.gateOut.bagsCounted === doc.totalBags;
  }

  // Auto status updates
  if (doc.mdApproval.status === 'APPROVED' && doc.status === 'Pending MD Approval') {
    doc.status = 'MD Approved';
  }
  if (doc.gateOut?.verifiedBy && doc.status === 'Loaded') {
    doc.status = 'Gate Out Verification';
  }
  if (doc.gateOutAt && doc.status === 'Gate Out Verification') {
    doc.status = 'Gate Out';
  }

  next();
});

// INDEXES
outgoingShipmentSchema.index({ shipmentNumber: 1 });
outgoingShipmentSchema.index({ customer: 1, createdAt: -1 });
outgoingShipmentSchema.index({ 'mdApproval.status': 1 });
outgoingShipmentSchema.index({ status: 1 });
outgoingShipmentSchema.index({ 'gateOut.verifiedAt': -1 });

const OutgoingShipment = mongoose.model('OutgoingShipment', outgoingShipmentSchema);
export default OutgoingShipment