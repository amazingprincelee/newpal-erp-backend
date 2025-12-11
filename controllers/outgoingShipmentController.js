// controllers/outgoingShipmentController.js - REFACTORED FOR NEW WORKFLOW
import OutgoingShipment from '../models/outgoingShipment.js';

// Generate unique shipment number
const generateShipmentNumber = async () => {
  const year = new Date().getFullYear();
  const count = await OutgoingShipment.countDocuments({
    createdAt: { $gte: new Date(year, 0, 1) }
  });
  const number = String(count + 1).padStart(6, '0');
  return `OS-${year}-${number}`;
};

// ========== STAGE 1: GATE ENTRY (Empty Truck) ==========
export const createOutgoingShipment = async (req, res) => {
  try {
    const {
      customer,
      driverName,
      driverPhone,
      truckPlateNumber,
      productType,
      quantityToLoad,
      destination,
      notes
    } = req.body;

    if (!customer || !driverName || !driverPhone || !truckPlateNumber || !productType || !quantityToLoad || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const shipmentNumber = await generateShipmentNumber();

    const shipment = new OutgoingShipment({
      shipmentNumber,
      gateEntry: {
        enteredBy: req.user.id,
        enteredAt: new Date(),
        customer,
        driverName,
        driverPhone,
        truckPlateNumber: truckPlateNumber.toUpperCase(),
        productType,
        quantityToLoad: Number(quantityToLoad),
        destination,
        notes
      },
      currentStatus: 'PENDING_MD_GATE_APPROVAL_OUT'
    });

    await shipment.save();
    await shipment.populate('gateEntry.customer', 'companyName contactPerson phone');
    await shipment.populate('gateEntry.enteredBy', 'fullname email');

    res.status(201).json({
      success: true,
      message: 'Empty truck gate entry created. Pending MD approval.',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 2: MD APPROVAL #1 (Gate Entry Approval) ==========
export const updateMDGateApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'PENDING_MD_GATE_APPROVAL_OUT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be pending gate approval' 
      });
    }

    shipment.mdApprovals.gateApproval = {
      status: status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      notes
    };

    if (status === 'APPROVED') {
      shipment.currentStatus = 'APPROVED_FOR_TARE_WEIGHT';
    } else {
      shipment.currentStatus = 'REJECTED_AT_GATE_OUT';
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

// ========== STAGE 3: WEIGHBRIDGE TARE (Empty Truck) ==========
export const updateWeighbridgeTare = async (req, res) => {
  try {
    const { id } = req.params;
    const { tareWeight, notes } = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'APPROVED_FOR_TARE_WEIGHT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be approved for tare weight' 
      });
    }

    shipment.weighbridge.tareWeight = Number(tareWeight);
    shipment.weighbridge.tareWeighedBy = req.user.id;
    shipment.weighbridge.tareWeighedAt = new Date();
    shipment.weighbridge.notes = notes;

    shipment.currentStatus = 'WEIGHBRIDGE_TARE_RECORDED';

    await shipment.save();

    // Auto-move to QC pre-loading
    shipment.currentStatus = 'AT_QC_PRE_LOADING';
    await shipment.save();

    await shipment.populate('weighbridge.tareWeighedBy', 'fullname email');

    res.json({
      success: true,
      message: 'Tare weight recorded. Truck sent to QC pre-loading.',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 4: QC PRE-LOADING INSPECTION ==========
export const updateQCPreLoading = async (req, res) => {
  try {
    const { id } = req.params;
    const qcData = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'AT_QC_PRE_LOADING') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be at QC pre-loading stage' 
      });
    }

    shipment.qcPreLoading = {
      ...qcData,
      inspectedBy: req.user.id,
      inspectedAt: new Date()
    };

    if (qcData.status === 'PASSED') {
      shipment.currentStatus = 'QC_PASSED_FOR_LOADING';
    } else {
      shipment.currentStatus = 'QC_REJECTED_PRE_LOADING';
    }

    await shipment.save();
    await shipment.populate('qcPreLoading.inspectedBy', 'fullname email');

    res.json({
      success: true,
      message: 'QC pre-loading inspection completed',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 5: WAREHOUSE LOADING ==========
export const submitWarehouseLoading = async (req, res) => {
  try {
    const { id } = req.params;
    const loadingData = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'QC_PASSED_FOR_LOADING' && shipment.currentStatus !== 'LOADING_IN_PROGRESS') {
      return res.status(400).json({ 
        success: false, 
        message: 'QC must pass before loading' 
      });
    }

    shipment.warehouseLoading = {
      ...loadingData,
      loadedBy: req.user.id,
      completed: loadingData.completed || false
    };

    if (loadingData.completed) {
      shipment.currentStatus = 'LOADING_COMPLETE';
      shipment.warehouseLoading.loadingEndTime = new Date();
    } else {
      shipment.currentStatus = 'LOADING_IN_PROGRESS';
      if (!shipment.warehouseLoading.loadingStartTime) {
        shipment.warehouseLoading.loadingStartTime = new Date();
      }
    }

    await shipment.save();

    res.json({
      success: true,
      message: loadingData.completed ? 'Loading completed' : 'Loading in progress',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 5B: QC POST-LOADING VERIFICATION ==========
export const updateQCPostLoading = async (req, res) => {
  try {
    const { id } = req.params;
    const qcData = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'LOADING_COMPLETE') {
      return res.status(400).json({ 
        success: false, 
        message: 'Loading must be complete before QC post-loading' 
      });
    }

    shipment.qcPostLoading = {
      ...qcData,
      verifiedBy: req.user.id,
      verifiedAt: new Date()
    };

    if (qcData.status === 'PASSED') {
      shipment.currentStatus = 'QC_PASSED_OUT';
    } else {
      shipment.currentStatus = 'QC_REJECTED_OUT';
    }

    await shipment.save();
    await shipment.populate('qcPostLoading.verifiedBy', 'fullname email');

    res.json({
      success: true,
      message: 'QC post-loading verification completed',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 6: WEIGHBRIDGE GROSS (Full Truck) ==========
export const updateWeighbridgeGross = async (req, res) => {
  try {
    const { id } = req.params;
    const { grossWeight, notes, operatorSignature } = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'QC_PASSED_OUT') {
      return res.status(400).json({ 
        success: false, 
        message: 'QC post-loading must pass before gross weighing' 
      });
    }

    shipment.weighbridge.grossWeight = Number(grossWeight);
    shipment.weighbridge.grossWeighedBy = req.user.id;
    shipment.weighbridge.grossWeighedAt = new Date();
    shipment.weighbridge.notes = notes;
    shipment.weighbridge.operatorSignature = operatorSignature;

    shipment.currentStatus = 'WEIGHBRIDGE_GROSS_RECORDED';

    await shipment.save();

    // Auto-move to pending MD approval #2
    shipment.currentStatus = 'PENDING_MD_APPROVAL_OUT_2';
    await shipment.save();

    await shipment.populate('weighbridge.grossWeighedBy', 'fullname email');

    res.json({
      success: true,
      message: 'Gross weight recorded. Pending MD final approval.',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STAGE 7: MD APPROVAL #2 (Final Exit Approval) ==========
export const updateMDFinalExitApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'PENDING_MD_APPROVAL_OUT_2') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be pending final approval' 
      });
    }

    shipment.mdApprovals.finalExitApproval = {
      status: status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      notes
    };

    if (status === 'APPROVED') {
      shipment.currentStatus = 'APPROVED_FOR_EXIT_OUT';
    } else {
      shipment.currentStatus = 'REJECTED_AT_FINAL_OUT';
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

// ========== STAGE 8: GATE EXIT ==========
export const processGateExit = async (req, res) => {
  try {
    const { id } = req.params;
    const { mdApprovalVerified, weighbridgeTicketVerified, loadingTicketVerified, qcApprovalVerified, notes } = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (shipment.currentStatus !== 'APPROVED_FOR_EXIT_OUT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be approved for exit' 
      });
    }

    shipment.gateExit = {
      exitedBy: req.user.id,
      exitedAt: new Date(),
      mdApprovalVerified,
      weighbridgeTicketVerified,
      loadingTicketVerified,
      qcApprovalVerified,
      notes
    };

    shipment.currentStatus = 'COMPLETED_OUTGOING';

    await shipment.save();
    await shipment.populate('gateExit.exitedBy', 'fullname email');

    res.json({
      success: true,
      message: 'Truck exited. Outgoing shipment completed.',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== HELPER ENDPOINTS ==========

// Get all outgoing shipments
export const getOutgoingShipments = async (req, res) => {
  try {
    const { status, customer, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.currentStatus = status;
    if (customer) filter['gateEntry.customer'] = customer;

    const shipments = await OutgoingShipment.find(filter)
      .populate('gateEntry.customer', 'companyName contactPerson phone')
      .populate('gateEntry.enteredBy', 'fullname email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: shipments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single shipment
export const getOutgoingShipmentById = async (req, res) => {
  try {
    const shipment = await OutgoingShipment.findById(req.params.id)
      .populate('gateEntry.customer gateEntry.enteredBy')
      .populate('qcPreLoading.inspectedBy')
      .populate('warehouseLoading.loadedBy')
      .populate('qcPostLoading.verifiedBy')
      .populate('weighbridge.tareWeighedBy weighbridge.grossWeighedBy')
      .populate('mdApprovals.gateApproval.reviewedBy')
      .populate('mdApprovals.finalExitApproval.reviewedBy')
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
export const getFinalExitReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shipment = await OutgoingShipment.findById(id)
      .populate('qcPreLoading.inspectedBy')
      .populate('warehouseLoading.loadedBy')
      .populate('qcPostLoading.verifiedBy')
      .populate('weighbridge.tareWeighedBy weighbridge.grossWeighedBy');

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    const report = {
      shipmentNumber: shipment.shipmentNumber,
      qcPreLoading: shipment.qcPreLoading,
      warehouseLoading: shipment.warehouseLoading,
      qcPostLoading: shipment.qcPostLoading,
      weighbridge: shipment.weighbridge
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete shipment
export const deleteOutgoingShipment = async (req, res) => {
  try {
    await OutgoingShipment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Shipment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dashboard stats
export const getOutgoingStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      OutgoingShipment.countDocuments({ currentStatus: 'PENDING_MD_GATE_APPROVAL_OUT' }),
      OutgoingShipment.countDocuments({ currentStatus: 'AT_QC_PRE_LOADING' }),
      OutgoingShipment.countDocuments({ currentStatus: 'LOADING_IN_PROGRESS' }),
      OutgoingShipment.countDocuments({ currentStatus: 'AT_QC_POST_LOADING' }),
      OutgoingShipment.countDocuments({ currentStatus: 'PENDING_MD_APPROVAL_OUT_2' }),
      OutgoingShipment.countDocuments({ currentStatus: 'APPROVED_FOR_EXIT_OUT' }),
      OutgoingShipment.countDocuments({ currentStatus: 'COMPLETED_OUTGOING' })
    ]);

    res.json({
      success: true,
      data: {
        pendingGateApproval: stats[0],
        atQCPreLoading: stats[1],
        loading: stats[2],
        atQCPostLoading: stats[3],
        pendingFinalApproval: stats[4],
        approvedForExit: stats[5],
        completed: stats[6]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};