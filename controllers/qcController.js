import IncomingShipment from "../models/incomingShipment.js";

// Get all shipments pending QC inspection (after MD approval)
export const getShipmentsPendingQC = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: 'APPROVED_FOR_QC',
      'qualityControl.status': 'PENDING'
    })
    .populate('gateEntry.vendor', 'name')
    .populate('gateEntry.enteredBy', 'name')
    .sort({ 'gateEntry.enteredAt': 1 });

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching shipments pending QC",
      error: error.message
    });
  }
};

// Get specific shipment for QC inspection
export const getShipmentForQC = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('gateEntry.enteredBy', 'name')
      .populate('mdApprovals.gateApproval.reviewedBy', 'name');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    res.status(200).json({
      success: true,
      data: shipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching shipment",
      error: error.message
    });
  }
};

// Get current active QC inspection
export const getActiveQCInspection = async (req, res) => {
  try {
    const activeShipment = await IncomingShipment.findOne({
      currentStatus: 'IN_QC'
    })
    .populate('gateEntry.vendor', 'name')
    .populate('gateEntry.enteredBy', 'name');

    res.status(200).json({
      success: true,
      data: activeShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active QC inspection",
      error: error.message
    });
  }
};

// Start QC inspection
export const startQCInspection = async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Verify shipment is approved for QC
    if (shipment.currentStatus !== 'APPROVED_FOR_QC') {
      return res.status(400).json({
        success: false,
        message: "Shipment not approved for QC inspection yet"
      });
    }

    // Check if there's already an active QC inspection
    const activeQC = await IncomingShipment.findOne({ currentStatus: 'IN_QC' });
    if (activeQC) {
      return res.status(400).json({
        success: false,
        message: "Another QC inspection is already in progress. Please complete it first."
      });
    }

    // Update status to IN_QC
    shipment.currentStatus = 'IN_QC';
    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('gateEntry.enteredBy', 'name');

    res.status(200).json({
      success: true,
      message: "QC inspection started",
      data: updatedShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error starting QC inspection",
      error: error.message
    });
  }
};

// Submit QC inspection - PASS (send to weighbridge for gross weight)
export const submitQCPass = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      visualAppearance,
      moistureContent,
      foreignMatter,
      damagedGrains,
      color,
      odor,
      notes,
      images
    } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    if (shipment.currentStatus !== 'IN_QC') {
      return res.status(400).json({
        success: false,
        message: "Shipment is not currently in QC inspection"
      });
    }

    // Update QC data
    shipment.qualityControl = {
      inspectedBy: req.user.id,
      inspectedAt: new Date(),
      visualAppearance,
      moistureContent: parseFloat(moistureContent),
      foreignMatter: parseFloat(foreignMatter),
      damagedGrains: parseFloat(damagedGrains),
      color,
      odor,
      notes: notes || '',
      images: images || [],
      status: 'PASSED',
      sendToLab: false
    };

    // Update status - move to weighbridge for GROSS weight (Stage 5)
    shipment.currentStatus = 'AT_WEIGHBRIDGE_GROSS';

    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('qualityControl.inspectedBy', 'name');

    res.status(200).json({
      success: true,
      message: "QC inspection passed. Shipment sent to weighbridge for gross weight.",
      data: updatedShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting QC pass",
      error: error.message
    });
  }
};

// Submit QC inspection - SEND TO LAB
export const submitQCSendToLab = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      visualAppearance,
      moistureContent,
      foreignMatter,
      damagedGrains,
      color,
      odor,
      notes,
      images,
      sampleId
    } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    if (shipment.currentStatus !== 'IN_QC') {
      return res.status(400).json({
        success: false,
        message: "Shipment is not currently in QC inspection"
      });
    }

    // Update QC data
    shipment.qualityControl = {
      inspectedBy: req.user.id,
      inspectedAt: new Date(),
      visualAppearance,
      moistureContent: parseFloat(moistureContent),
      foreignMatter: parseFloat(foreignMatter),
      damagedGrains: parseFloat(damagedGrains),
      color,
      odor,
      notes: notes || '',
      images: images || [],
      status: 'SENT_TO_LAB',
      sendToLab: true
    };

    // Initialize lab analysis with sample ID
    shipment.labAnalysis = {
      sampleId: sampleId || `LAB-${Date.now()}`,
      status: undefined // Will be updated by lab
    };

    // Update status to IN_LAB (Stage 4)
    shipment.currentStatus = 'IN_LAB';

    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('qualityControl.inspectedBy', 'name');

    res.status(200).json({
      success: true,
      message: "Sample sent to lab for further analysis.",
      data: updatedShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending to lab",
      error: error.message
    });
  }
};

// Submit QC inspection - REJECT
export const submitQCReject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      visualAppearance,
      moistureContent,
      foreignMatter,
      damagedGrains,
      color,
      odor,
      notes,
      images,
      rejectionReason
    } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    if (shipment.currentStatus !== 'IN_QC') {
      return res.status(400).json({
        success: false,
        message: "Shipment is not currently in QC inspection"
      });
    }

    // Update QC data
    shipment.qualityControl = {
      inspectedBy: req.user.id,
      inspectedAt: new Date(),
      visualAppearance: visualAppearance || 'Poor',
      moistureContent: parseFloat(moistureContent) || 0,
      foreignMatter: parseFloat(foreignMatter) || 0,
      damagedGrains: parseFloat(damagedGrains) || 0,
      color: color || 'Heavily Discolored',
      odor: odor || 'Foul',
      notes: `REJECTED: ${rejectionReason || notes || 'Failed QC inspection'}`,
      images: images || [],
      status: 'FAILED',
      sendToLab: false
    };

    // Update status to REJECTED
    shipment.currentStatus = 'QC_REJECTED';

    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('qualityControl.inspectedBy', 'name');

    res.status(200).json({
      success: true,
      message: "Shipment rejected due to QC failure.",
      data: updatedShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error rejecting shipment",
      error: error.message
    });
  }
};

// Get QC statistics
export const getQCStatistics = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's QC inspections
    const todayInspections = await IncomingShipment.find({
      'qualityControl.inspectedAt': {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    const totalInspected = todayInspections.length;
    const passed = todayInspections.filter(s => s.qualityControl?.status === 'PASSED').length;
    const sentToLab = todayInspections.filter(s => s.qualityControl?.status === 'SENT_TO_LAB').length;
    const failed = todayInspections.filter(s => s.qualityControl?.status === 'FAILED').length;

    res.status(200).json({
      success: true,
      data: {
        totalInspected,
        passed,
        sentToLab,
        failed,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching QC statistics",
      error: error.message
    });
  }
};