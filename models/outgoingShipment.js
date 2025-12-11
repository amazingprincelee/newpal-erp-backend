// models/OutgoingShipment.js - REFACTORED TO MATCH NEW WORKFLOW
import mongoose from 'mongoose';

const outgoingShipmentSchema = new mongoose.Schema({
  // === AUTO-GENERATED UNIQUE ID ===
  shipmentNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    // e.g., OS-2025-000123
  },

  // === STAGE 1: GATE ENTRY (Empty Truck Entry) ===
  gateEntry: {
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enteredAt: { type: Date, default: Date.now },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    driverName: { type: String, required: true },
    driverPhone: { type: String, required: true },
    truckPlateNumber: { type: String, required: true, uppercase: true },
    productType: { type: String, required: true },
    quantityToLoad: { type: Number, required: true, min: 1 }, // bags/tons
    destination: { type: String, required: true },
    notes: String
  },

  // === STAGE 2: MD APPROVAL #1 & #2 ===
  mdApprovals: {
    // MD Approval #1 - Gate Entry (Approve Empty Entry)
    gateApproval: {
      status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      notes: String
    },

    // MD Approval #2 - Final Exit (Reviews all reports)
    finalExitApproval: {
      status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      notes: String
    }
  },

  // === STAGE 3: WEIGHBRIDGE - FIRST WEIGHT (Empty Tare) ===
  weighbridge: {
    // First Weight - TARE (Empty truck)
    tareWeight: Number,
    tareWeighedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tareWeighedAt: Date,
    
    // Second Weight - GROSS (Full truck)
    grossWeight: Number,
    grossWeighedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grossWeighedAt: Date,
    
    // Auto-calculated fields
    netWeight: { type: Number, default: 0 },
    bagsLoaded: Number, // From QC post-loading report
    averageWeightPerBag: Number,
    weightPerBagStandard: { type: Number, default: 120 }, // 120kg standard
    discrepancyBags: Number,
    discrepancyPercent: Number,
    flagDiscrepancy: { type: Boolean, default: false },
    discrepancyReason: String,
    
    notes: String,
    operatorSignature: String
  },

  // === STAGE 4: QC PRE-LOADING INSPECTION ===
  qcPreLoading: {
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: Date,
    productQuality: { type: String, enum: ['Good', 'Fair', 'Poor'] },
    moistureContent: Number,
    foreignMatter: Number,
    infestation: { type: String, enum: ['None', 'Minor', 'Major'] },
    bagCondition: { type: String, enum: ['Good', 'Fair', 'Poor'] },
    notes: String,
    images: [String],
    status: { type: String, enum: ['PASSED', 'REJECTED', 'PENDING'], default: 'PENDING' }
  },

  // === STAGE 5: WAREHOUSE LOADING ===
  warehouseLoading: {
    loadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    loadingStartTime: Date,
    loadingEndTime: Date,
    loadingQuantity: Number, // Number of bags loaded
    conditionOfBagsLoaded: String,
    pictures: [{
      url: String,
      caption: String,
      uploadedAt: Date
    }],
    warehouseOfficer: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      signature: String,
      signedAt: Date
    },
    completed: { type: Boolean, default: false }
  },

  // === STAGE 5B: QC POST-LOADING VERIFICATION ===
  qcPostLoading: {
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    numberOfLoadedBags: Number, // Actual count after loading
    qualityQuantityMatch: { type: Boolean, default: false }, // Does it match approved?
    sealsApplied: { type: Boolean, default: false },
    sealNumbers: [String], // Array of seal numbers
    notes: String,
    images: [String],
    qcOfficer: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      signature: String,
      signedAt: Date
    },
    status: { type: String, enum: ['PASSED', 'REJECTED', 'PENDING'], default: 'PENDING' }
  },

  // === STAGE 8: GATE EXIT ===
  gateExit: {
    exitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    exitedAt: Date,
    mdApprovalVerified: { type: Boolean, default: false },
    weighbridgeTicketVerified: { type: Boolean, default: false },
    loadingTicketVerified: { type: Boolean, default: false },
    qcApprovalVerified: { type: Boolean, default: false },
    notes: String
  },

  // === DOCUMENTS ===
  deliveryNoteNumber: { type: String, unique: true, sparse: true },
  waybillNumber: { type: String, unique: true, sparse: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },

  // === CURRENT STATUS ===
  currentStatus: {
    type: String,
    enum: [
      'AT_GATE',
      'PENDING_MD_GATE_APPROVAL_OUT',
      'APPROVED_FOR_TARE_WEIGHT',
      'REJECTED_AT_GATE_OUT',
      'WEIGHBRIDGE_TARE_RECORDED',
      'AT_QC_PRE_LOADING',
      'QC_PASSED_FOR_LOADING',
      'QC_REJECTED_PRE_LOADING',
      'LOADING_IN_PROGRESS',
      'LOADING_COMPLETE',
      'AT_QC_POST_LOADING',
      'QC_PASSED_OUT',
      'QC_REJECTED_OUT',
      'WEIGHBRIDGE_GROSS_RECORDED',
      'PENDING_MD_APPROVAL_OUT_2',
      'APPROVED_FOR_EXIT_OUT',
      'REJECTED_AT_FINAL_OUT',
      'AT_GATE_EXIT',
      'COMPLETED_OUTGOING'
    ],
    default: 'AT_GATE'
  },

  // === DELIVERY INFO (Optional - for tracking) ===
  delivery: {
    inTransit: { type: Boolean, default: false },
    inTransitAt: Date,
    deliveredAt: Date,
    receivedBy: String,
    actualBagsReceived: Number,
    shortLandedBags: Number,
    damageReport: String,
    proofOfDelivery: [String], // Images
    customerSignature: String
  },

  // === AUDIT TRAIL ===
  statusHistory: [{
    status: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    notes: String
  }],

  notes: String,
  internalNotes: String

}, { timestamps: true });

// === AUTO-CALCULATIONS ===
outgoingShipmentSchema.pre('save', function(next) {
  const doc = this;

  // Calculate net weight after gross weight is recorded
  if (doc.weighbridge?.grossWeight && doc.weighbridge?.tareWeight) {
    doc.weighbridge.netWeight = doc.weighbridge.grossWeight - doc.weighbridge.tareWeight;
    
    // Get loaded bags from QC post-loading report
    const loadedBags = doc.qcPostLoading?.numberOfLoadedBags || 0;
    doc.weighbridge.bagsLoaded = loadedBags;
    
    if (loadedBags > 0) {
      doc.weighbridge.averageWeightPerBag = doc.weighbridge.netWeight / loadedBags;
      
      // Check if average weight is within acceptable range (120kg ± 5kg)
      const standard = doc.weighbridge.weightPerBagStandard || 120;
      const lowerBound = standard - 5;
      const upperBound = standard + 5;
      
      if (doc.weighbridge.averageWeightPerBag < lowerBound || 
          doc.weighbridge.averageWeightPerBag > upperBound) {
        doc.weighbridge.flagDiscrepancy = true;
        doc.weighbridge.discrepancyReason = 
          `Average bag weight (${doc.weighbridge.averageWeightPerBag.toFixed(2)}kg) ` +
          `outside normal range (${standard}kg ± 5kg)`;
      }
    }
    
    // Calculate discrepancy with quantity to load
    doc.weighbridge.discrepancyBags = loadedBags - doc.gateEntry.quantityToLoad;
    doc.weighbridge.discrepancyPercent = doc.gateEntry.quantityToLoad > 0
      ? (doc.weighbridge.discrepancyBags / doc.gateEntry.quantityToLoad) * 100
      : 0;
  }

  // Calculate short-landed bags if delivered
  if (doc.delivery?.actualBagsReceived != null) {
    const loadedBags = doc.qcPostLoading?.numberOfLoadedBags || 0;
    doc.delivery.shortLandedBags = loadedBags - doc.delivery.actualBagsReceived;
  }

  // Status history tracking
  if (doc.isModified('currentStatus')) {
    doc.statusHistory.push({
      status: doc.currentStatus,
      changedAt: new Date()
    });
  }

  // Auto-update status based on MD approvals
  if (doc.isModified('mdApprovals.gateApproval.status')) {
    if (doc.mdApprovals.gateApproval.status === 'APPROVED') {
      doc.currentStatus = 'APPROVED_FOR_TARE_WEIGHT';
    } else if (doc.mdApprovals.gateApproval.status === 'REJECTED') {
      doc.currentStatus = 'REJECTED_AT_GATE_OUT';
    }
  }

  if (doc.isModified('mdApprovals.finalExitApproval.status')) {
    if (doc.mdApprovals.finalExitApproval.status === 'APPROVED') {
      doc.currentStatus = 'APPROVED_FOR_EXIT_OUT';
    } else if (doc.mdApprovals.finalExitApproval.status === 'REJECTED') {
      doc.currentStatus = 'REJECTED_AT_FINAL_OUT';
    }
  }

  // Auto-update loading completion status
  if (doc.warehouseLoading?.completed && 
      doc.currentStatus === 'LOADING_IN_PROGRESS') {
    doc.currentStatus = 'LOADING_COMPLETE';
  }

  next();
});

// Indexes
outgoingShipmentSchema.index({ currentStatus: 1 });
outgoingShipmentSchema.index({ 'gateEntry.customer': 1 });
outgoingShipmentSchema.index({ 'mdApprovals.gateApproval.status': 1 });
outgoingShipmentSchema.index({ 'mdApprovals.finalExitApproval.status': 1 });
outgoingShipmentSchema.index({ createdAt: -1 });

const OutgoingShipment = mongoose.model('OutgoingShipment', outgoingShipmentSchema);
export default OutgoingShipment;