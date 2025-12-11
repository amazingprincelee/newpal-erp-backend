// models/IncomingShipment.js - REFACTORED TO MATCH NEW WORKFLOW
import mongoose from 'mongoose';

const incomingShipmentSchema = new mongoose.Schema({
  // === AUTO-GENERATED UNIQUE ID ===
  shipmentNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    // e.g., IS-2025-000487
  },

  // === STAGE 1: GATE ENTRY ===
  gateEntry: {
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enteredAt: { type: Date, default: Date.now },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    driverName: { type: String, required: true },
    driverPhone: { type: String, required: true },
    truckPlateNumber: { type: String, required: true, uppercase: true },
    waybillNumber: String,
    declaredBags: { type: Number, required: true, min: 1 },
    productType: { type: String, required: true },
    origin: { type: String, required: true },
    notes: String
  },

  // === STAGE 2: MD APPROVAL #1 (Gate Entry Approval) ===
  mdApprovals: {
    // MD Approval #1 - Gate Entry
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

    // MD Approval #2 - Pre-Offload (Reviews QC + Lab + Weighbridge Gross)
    preOffloadApproval: {
      status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      notes: String
    },

    // MD Approval #3 - Final Exit (Reviews Offload Reports + Weighbridge Final)
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

  // === STAGE 3: QC INSPECTION ===
  qualityControl: {
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: Date,
    visualAppearance: { type: String, enum: ['Good', 'Fair', 'Poor'] },
    moistureContent: Number,
    foreignMatter: Number,
    damagedGrains: Number,
    color: String,
    odor: { type: String, enum: ['Normal', 'Musty', 'Foul'] },
    notes: String,
    images: [String],
    status: { type: String, enum: ['PASSED', 'FAILED', 'SENT_TO_LAB', 'PENDING'], default: 'PENDING' },
    sendToLab: { type: Boolean, default: false }
  },

  // === STAGE 4: LAB ANALYSIS (if needed) ===
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

  // === STAGE 5 & 8: WEIGHBRIDGE (Gross & Tare) ===
  weighbridge: {
    // First Weight - GROSS (Stage 5)
    grossWeight: Number,
    grossWeighedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grossWeighedAt: Date,
    
    // Second Weight - TARE (Stage 8)
    tareWeight: Number,
    tareWeighedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tareWeighedAt: Date,
    
    // Auto-calculated fields
    netWeight: { type: Number, default: 0 },
    numberOfAcceptedBags: Number, // From security report
    averageWeightPerBag: Number,
    weightPerBagStandard: { type: Number, default: 120 }, // 120kg standard
    discrepancyBags: Number,
    discrepancyPercent: Number,
    flagDiscrepancy: { type: Boolean, default: false },
    discrepancyReason: String,
    
    notes: String,
    operatorSignature: String
  },

  // === STAGE 7: OFFLOADING (3 Departments) ===
  offloadReports: {
    // A. QC & Stock Keeper Report
    qcStockKeeperReport: {
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      submittedAt: Date,
      numberOfSampleBags: Number,
      numberOfRejectedBags: Number,
      numberOfAcceptedBags: Number,
      totalBagsAcceptedIntoInventory: Number,
      visualQualityIssues: String,
      insectsFound: {
        noneFound: { type: Boolean, default: true },
        liveInsects: String,
        deadInsects: String
      },
      pictures: [{
        url: String,
        caption: String,
        uploadedAt: Date
      }],
      qcOfficer: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        signature: String,
        signedAt: Date
      },
      stockKeeper: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        signature: String,
        signedAt: Date
      },
      completed: { type: Boolean, default: false }
    },

    // B. Warehouse Report
    warehouseReport: {
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      submittedAt: Date,
      storageLocation: String,
      conditionDuringOffload: String,
      additionalNotes: String,
      pictures: [{
        url: String,
        caption: String,
        uploadedAt: Date
      }],
      warehouseStaff: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        signature: String,
        signedAt: Date
      },
      completed: { type: Boolean, default: false }
    },

    // C. Security Report
    securityReport: {
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      submittedAt: Date,
      totalBagsInTruck: Number,
      totalBagsRejected: Number,
      totalBagsAccepted: Number,
      bagCountVerified: { type: Boolean, default: false },
      discrepancyObserved: { type: Boolean, default: false },
      discrepancyDescription: String,
      additionalNotes: String,
      pictures: [{
        url: String,
        caption: String,
        uploadedAt: Date
      }],
      securityOfficer: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        badgeNumber: String,
        signature: String,
        signedAt: Date
      },
      completed: { type: Boolean, default: false }
    }
  },

  // === STAGE 10: GATE EXIT ===
  gateExit: {
    exitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    exitedAt: Date,
    gatePassVerified: { type: Boolean, default: false },
    deliveryNoteVerified: { type: Boolean, default: false },
    weighbridgeTicketVerified: { type: Boolean, default: false },
    notes: String
  },

  // === CURRENT STATUS (Single Source of Truth) ===
  currentStatus: {
    type: String,
    enum: [
      'AT_GATE',
      'PENDING_MD_GATE_APPROVAL',
      'APPROVED_FOR_QC',
      'REJECTED_AT_GATE',
      'IN_QC',
      'QC_PASSED',
      'QC_REJECTED',
      'IN_LAB',
      'LAB_PASSED',
      'LAB_REJECTED',
      'AT_WEIGHBRIDGE_GROSS',
      'WEIGHBRIDGE_GROSS_RECORDED',
      'PENDING_MD_APPROVAL_2',
      'APPROVED_FOR_OFFLOAD',
      'REJECTED_PRE_OFFLOAD',
      'OFFLOADING_IN_PROGRESS',
      'OFFLOADING_COMPLETE',
      'AT_WEIGHBRIDGE_TARE',
      'WEIGHBRIDGE_TARE_RECORDED',
      'PENDING_MD_APPROVAL_3',
      'APPROVED_FOR_EXIT',
      'AT_GATE_EXIT',
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

  // Calculate net weight and averages after tare weight is recorded
  if (doc.weighbridge?.grossWeight && doc.weighbridge?.tareWeight) {
    doc.weighbridge.netWeight = doc.weighbridge.grossWeight - doc.weighbridge.tareWeight;
    
    // Get accepted bags from security report
    const acceptedBags = doc.offloadReports?.securityReport?.totalBagsAccepted || 0;
    doc.weighbridge.numberOfAcceptedBags = acceptedBags;
    
    if (acceptedBags > 0) {
      doc.weighbridge.averageWeightPerBag = doc.weighbridge.netWeight / acceptedBags;
      
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
    
    // Calculate discrepancy with declared bags
    const totalBagsInTruck = doc.offloadReports?.securityReport?.totalBagsInTruck || 0;
    doc.weighbridge.discrepancyBags = totalBagsInTruck - doc.gateEntry.declaredBags;
    doc.weighbridge.discrepancyPercent = doc.gateEntry.declaredBags > 0
      ? (doc.weighbridge.discrepancyBags / doc.gateEntry.declaredBags) * 100
      : 0;
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
      doc.currentStatus = 'APPROVED_FOR_QC';
    } else if (doc.mdApprovals.gateApproval.status === 'REJECTED') {
      doc.currentStatus = 'REJECTED_AT_GATE';
    }
  }

  if (doc.isModified('mdApprovals.preOffloadApproval.status')) {
    if (doc.mdApprovals.preOffloadApproval.status === 'APPROVED') {
      doc.currentStatus = 'APPROVED_FOR_OFFLOAD';
    } else if (doc.mdApprovals.preOffloadApproval.status === 'REJECTED') {
      doc.currentStatus = 'REJECTED_PRE_OFFLOAD';
    }
  }

  if (doc.isModified('mdApprovals.finalExitApproval.status')) {
    if (doc.mdApprovals.finalExitApproval.status === 'APPROVED') {
      doc.currentStatus = 'APPROVED_FOR_EXIT';
    }
  }

  next();
});

// Indexes

incomingShipmentSchema.index({ currentStatus: 1 });
incomingShipmentSchema.index({ 'gateEntry.vendor': 1 });
incomingShipmentSchema.index({ 'mdApprovals.gateApproval.status': 1 });
incomingShipmentSchema.index({ 'mdApprovals.preOffloadApproval.status': 1 });
incomingShipmentSchema.index({ 'mdApprovals.finalExitApproval.status': 1 });
incomingShipmentSchema.index({ createdAt: -1 });

const IncomingShipment = mongoose.model('IncomingShipment', incomingShipmentSchema);
export default IncomingShipment;