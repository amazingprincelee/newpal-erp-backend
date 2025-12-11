// controllers/incomingShipmentController.js - REFACTORED FOR NEW WORKFLOW
import IncomingShipment from '../models/incomingShipment.js';

// Generate unique shipment number
const generateShipmentNumber = async () => {
  const year = new Date().getFullYear();
  const count = await IncomingShipment.countDocuments({
    createdAt: { $gte: new Date(year, 0, 1) }
  });
  const number = String(count + 1).padStart(6, '0');
  return `IS-${year}-${number}`;
};

// ========== STAGE 1: GATE ENTRY ==========
export const createIncomingShipment = async (req, res) => {
  try {
    const {
      vendor,
      driverName,
      driverPhone,
      truckPlateNumber,
      waybillNumber,
      declaredBags,
      productType,
      origin,
      notes
    } = req.body;

    if (!vendor || !driverName || !driverPhone || !truckPlateNumber || !declaredBags || !productType || !origin) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const shipmentNumber = await generateShipmentNumber();

    const shipment = new IncomingShipment({
      shipmentNumber,
      gateEntry: {
        enteredBy: req.user.id,
        enteredAt: new Date(),
        vendor,
        driverName,
        driverPhone,
        truckPlateNumber: truckPlateNumber.toUpperCase(),
        waybillNumber,
        declaredBags: Number(declaredBags),
        productType,
        origin,
        notes
      },
      currentStatus: 'PENDING_MD_GATE_APPROVAL'
    });

    await shipment.save();
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson phone');
    await shipment.populate('gateEntry.enteredBy', 'fullname username email');

    res.status(201).json({
      success: true,
      message: 'Gate entry created. Pending MD approval.',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 2: MD APPROVAL #1 (Gate Approval) ==========
export const updateMDGateApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'PENDING_MD_GATE_APPROVAL') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be pending gate approval' 
      });
    }

    shipment.mdApprovals.gateApproval = {
      status: status, // 'APPROVED' or 'REJECTED'
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      notes
    };

    // Auto-update currentStatus
    if (status === 'APPROVED') {
      shipment.currentStatus = 'APPROVED_FOR_QC';
    } else {
      shipment.currentStatus = 'REJECTED_AT_GATE';
    }

    await shipment.save();
    await shipment.populate('mdApprovals.gateApproval.reviewedBy', 'fullname email');

    res.json({
      success: true,
      message: `Gate entry ${status.toLowerCase()}`,
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 3: QC INSPECTION ==========
export const updateQCInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const qcData = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'APPROVED_FOR_QC' && shipment.currentStatus !== 'IN_QC') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be approved for QC' 
      });
    }

    shipment.qualityControl = {
      ...qcData,
      inspectedBy: req.user.id,
      inspectedAt: new Date()
    };

    // Update status based on QC result
    if (qcData.sendToLab) {
      shipment.currentStatus = 'IN_LAB';
      shipment.qualityControl.status = 'SENT_TO_LAB';
    } else if (qcData.status === 'PASSED') {
      shipment.currentStatus = 'QC_PASSED';
      shipment.qualityControl.status = 'PASSED';
    } else if (qcData.status === 'FAILED') {
      shipment.currentStatus = 'QC_REJECTED';
      shipment.qualityControl.status = 'FAILED';
    }

    await shipment.save();
    await shipment.populate('qualityControl.inspectedBy', 'fullname email');

    res.json({
      success: true,
      message: 'QC inspection completed',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 4: LAB ANALYSIS ==========
export const updateLabAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const labData = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'IN_LAB') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be in lab stage' 
      });
    }

    shipment.labAnalysis = {
      ...labData,
      analyzedBy: req.user.id,
      analyzedAt: new Date()
    };

    if (labData.status === 'PASSED') {
      shipment.currentStatus = 'LAB_PASSED';
    } else {
      shipment.currentStatus = 'LAB_REJECTED';
    }

    await shipment.save();
    await shipment.populate('labAnalysis.analyzedBy', 'fullname email');

    res.json({
      success: true,
      message: 'Lab analysis completed',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 5: WEIGHBRIDGE GROSS WEIGHT ==========
export const updateWeighbridgeGross = async (req, res) => {
  try {
    const { id } = req.params;
    const { grossWeight, notes } = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    // Must have passed QC (and Lab if sent)
    const validStatuses = ['QC_PASSED', 'LAB_PASSED', 'AT_WEIGHBRIDGE_GROSS'];
    if (!validStatuses.includes(shipment.currentStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must pass QC/Lab before weighing' 
      });
    }

    shipment.weighbridge.grossWeight = Number(grossWeight);
    shipment.weighbridge.grossWeighedBy = req.user.id;
    shipment.weighbridge.grossWeighedAt = new Date();
    shipment.weighbridge.notes = notes;

    shipment.currentStatus = 'WEIGHBRIDGE_GROSS_RECORDED';

    await shipment.save();

    // Auto-move to pending MD approval #2
    shipment.currentStatus = 'PENDING_MD_APPROVAL_2';
    await shipment.save();

    await shipment.populate('weighbridge.grossWeighedBy', 'fullname email');

    res.json({
      success: true,
      message: 'Gross weight recorded. Pending MD approval for offload.',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 6: MD APPROVAL #2 (Pre-Offload) ==========
export const updateMDPreOffloadApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'PENDING_MD_APPROVAL_2') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be pending pre-offload approval' 
      });
    }

    shipment.mdApprovals.preOffloadApproval = {
      status: status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      notes
    };

    if (status === 'APPROVED') {
      shipment.currentStatus = 'APPROVED_FOR_OFFLOAD';
    } else {
      shipment.currentStatus = 'REJECTED_PRE_OFFLOAD';
    }

    await shipment.save();
    await shipment.populate('mdApprovals.preOffloadApproval.reviewedBy', 'fullname email');

    res.json({
      success: true,
      message: `Pre-offload ${status.toLowerCase()}`,
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 7A: QC & STOCK KEEPER OFFLOAD REPORT ==========
export const submitQCStockKeeperReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reportData = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (!['APPROVED_FOR_OFFLOAD', 'OFFLOADING_IN_PROGRESS'].includes(shipment.currentStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be approved for offload' 
      });
    }

    shipment.offloadReports.qcStockKeeperReport = {
      ...reportData,
      submittedBy: req.user.id,
      submittedAt: new Date(),
      completed: true
    };

    shipment.currentStatus = 'OFFLOADING_IN_PROGRESS';
    
    // Check if all 3 reports are complete
    if (shipment.offloadReports.warehouseReport?.completed && 
        shipment.offloadReports.securityReport?.completed) {
      shipment.currentStatus = 'OFFLOADING_COMPLETE';
    }

    await shipment.save();

    res.json({
      success: true,
      message: 'QC & Stock Keeper report submitted',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 7B: WAREHOUSE OFFLOAD REPORT ==========
export const submitWarehouseReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reportData = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    shipment.offloadReports.warehouseReport = {
      ...reportData,
      submittedBy: req.user.id,
      submittedAt: new Date(),
      completed: true
    };

    shipment.currentStatus = 'OFFLOADING_IN_PROGRESS';
    
    if (shipment.offloadReports.qcStockKeeperReport?.completed && 
        shipment.offloadReports.securityReport?.completed) {
      shipment.currentStatus = 'OFFLOADING_COMPLETE';
    }

    await shipment.save();

    res.json({
      success: true,
      message: 'Warehouse report submitted',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 7C: SECURITY OFFLOAD REPORT ==========
export const submitSecurityReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reportData = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    shipment.offloadReports.securityReport = {
      ...reportData,
      submittedBy: req.user.id,
      submittedAt: new Date(),
      completed: true
    };

    shipment.currentStatus = 'OFFLOADING_IN_PROGRESS';
    
    if (shipment.offloadReports.qcStockKeeperReport?.completed && 
        shipment.offloadReports.warehouseReport?.completed) {
      shipment.currentStatus = 'OFFLOADING_COMPLETE';
    }

    await shipment.save();

    res.json({
      success: true,
      message: 'Security report submitted',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 8: WEIGHBRIDGE TARE WEIGHT ==========
export const updateWeighbridgeTare = async (req, res) => {
  try {
    const { id } = req.params;
    const { tareWeight, notes, operatorSignature } = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'OFFLOADING_COMPLETE') {
      return res.status(400).json({ 
        success: false, 
        message: 'Offloading must be complete before tare weighing' 
      });
    }

    shipment.weighbridge.tareWeight = Number(tareWeight);
    shipment.weighbridge.tareWeighedBy = req.user.id;
    shipment.weighbridge.tareWeighedAt = new Date();
    shipment.weighbridge.notes = notes;
    shipment.weighbridge.operatorSignature = operatorSignature;

    shipment.currentStatus = 'WEIGHBRIDGE_TARE_RECORDED';

    await shipment.save();

    // Auto-move to pending MD approval #3
    shipment.currentStatus = 'PENDING_MD_APPROVAL_3';
    await shipment.save();

    await shipment.populate('weighbridge.tareWeighedBy', 'fullname email');

    res.json({
      success: true,
      message: 'Tare weight recorded. Pending MD final approval.',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 9: MD APPROVAL #3 (Final Exit) ==========
export const updateMDFinalExitApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'PENDING_MD_APPROVAL_3') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be pending final exit approval' 
      });
    }

    shipment.mdApprovals.finalExitApproval = {
      status: status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      notes
    };

    if (status === 'APPROVED') {
      shipment.currentStatus = 'APPROVED_FOR_EXIT';
    }

    await shipment.save();
    await shipment.populate('mdApprovals.finalExitApproval.reviewedBy', 'fullname email');

    res.json({
      success: true,
      message: `Final exit ${status.toLowerCase()}`,
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 10: GATE EXIT ==========
export const processGateExit = async (req, res) => {
  try {
    const { id } = req.params;
    const { gatePassVerified, deliveryNoteVerified, weighbridgeTicketVerified, notes } = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'APPROVED_FOR_EXIT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be approved for exit' 
      });
    }

    shipment.gateExit = {
      exitedBy: req.user.id,
      exitedAt: new Date(),
      gatePassVerified,
      deliveryNoteVerified,
      weighbridgeTicketVerified,
      notes
    };

    shipment.currentStatus = 'COMPLETED';

    await shipment.save();
    await shipment.populate('gateExit.exitedBy', 'fullname email');

    res.json({
      success: true,
      message: 'Truck exited. Shipment completed.',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== HELPER ENDPOINTS ==========

// Get all incoming shipments
export const getIncomingShipments = async (req, res) => {
  try {
    const { status, vendor, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.currentStatus = status;
    if (vendor) filter['gateEntry.vendor'] = vendor;

    const shipments = await IncomingShipment.find(filter)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('gateEntry.enteredBy', 'fullname email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: shipments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single shipment
export const getIncomingShipmentById = async (req, res) => {
  try {
    const shipment = await IncomingShipment.findById(req.params.id)
      .populate('gateEntry.vendor gateEntry.enteredBy')
      .populate('qualityControl.inspectedBy')
      .populate('labAnalysis.analyzedBy')
      .populate('weighbridge.grossWeighedBy weighbridge.tareWeighedBy')
      .populate('mdApprovals.gateApproval.reviewedBy')
      .populate('mdApprovals.preOffloadApproval.reviewedBy')
      .populate('mdApprovals.finalExitApproval.reviewedBy')
      .populate('offloadReports.qcStockKeeperReport.submittedBy')
      .populate('offloadReports.warehouseReport.submittedBy')
      .populate('offloadReports.securityReport.submittedBy')
      .populate('gateExit.exitedBy');

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    res.json({ success: true, data: shipment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get consolidated report for MD Approval #2
export const getPreOffloadReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor')
      .populate('qualityControl.inspectedBy')
      .populate('labAnalysis.analyzedBy')
      .populate('weighbridge.grossWeighedBy');

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    const report = {
      shipmentNumber: shipment.shipmentNumber,
      gateEntry: shipment.gateEntry,
      qualityControl: shipment.qualityControl,
      labAnalysis: shipment.labAnalysis,
      weighbridge: {
        grossWeight: shipment.weighbridge.grossWeight,
        grossWeighedAt: shipment.weighbridge.grossWeighedAt,
        grossWeighedBy: shipment.weighbridge.grossWeighedBy
      }
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get consolidated report for MD Approval #3
export const getFinalExitReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shipment = await IncomingShipment.findById(id)
      .populate('offloadReports.qcStockKeeperReport.submittedBy')
      .populate('offloadReports.warehouseReport.submittedBy')
      .populate('offloadReports.securityReport.submittedBy')
      .populate('weighbridge.tareWeighedBy');

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    const report = {
      shipmentNumber: shipment.shipmentNumber,
      offloadReports: shipment.offloadReports,
      weighbridge: shipment.weighbridge
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete shipment
export const deleteIncomingShipment = async (req, res) => {
  try {
    await IncomingShipment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Shipment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dashboard stats
export const getIncomingStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      IncomingShipment.countDocuments({ currentStatus: 'PENDING_MD_GATE_APPROVAL' }),
      IncomingShipment.countDocuments({ currentStatus: 'APPROVED_FOR_QC' }),
      IncomingShipment.countDocuments({ currentStatus: 'IN_QC' }),
      IncomingShipment.countDocuments({ currentStatus: 'IN_LAB' }),
      IncomingShipment.countDocuments({ currentStatus: 'PENDING_MD_APPROVAL_2' }),
      IncomingShipment.countDocuments({ currentStatus: 'OFFLOADING_IN_PROGRESS' }),
      IncomingShipment.countDocuments({ currentStatus: 'PENDING_MD_APPROVAL_3' }),
      IncomingShipment.countDocuments({ currentStatus: 'APPROVED_FOR_EXIT' }),
      IncomingShipment.countDocuments({ currentStatus: 'COMPLETED' })
    ]);

    res.json({
      success: true,
      data: {
        pendingGateApproval: stats[0],
        approvedForQC: stats[1],
        inQC: stats[2],
        inLab: stats[3],
        pendingPreOffloadApproval: stats[4],
        offloading: stats[5],
        pendingFinalApproval: stats[6],
        approvedForExit: stats[7],
        completed: stats[8]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};