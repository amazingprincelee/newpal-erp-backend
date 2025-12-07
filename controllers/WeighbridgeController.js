import IncomingShipment from "../models/incomingShipment.js";

// Get all shipments awaiting weighing (QC/Lab passed, not yet weighed)
export const getShipmentsAwaitingWeighing = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: { $in: ['IN_QC', 'IN_LAB'] },
      $or: [
        { 'qualityControl.status': 'PASSED' },
        { 'labAnalysis.status': 'PASSED' }
      ],
      'weighbridge.weighedAt': { $exists: false }
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
      message: "Error fetching shipments awaiting weighing",
      error: error.message
    });
  }
};

// Get shipment for active weighing
export const getShipmentForWeighing = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('gateEntry.enteredBy', 'name')
      .populate('qualityControl.inspectedBy', 'name')
      .populate('labAnalysis.analyzedBy', 'name');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Verify shipment is ready for weighing
    const qcPassed = shipment.qualityControl?.status === 'PASSED';
    const labPassed = shipment.qualityControl?.sendToLab 
      ? shipment.labAnalysis?.status === 'PASSED' 
      : true;

    if (!qcPassed || !labPassed) {
      return res.status(400).json({
        success: false,
        message: "Shipment must pass QC and Lab checks before weighing"
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

// Submit weighbridge data
export const submitWeighbridgeData = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      grossWeight,
      tareWeight,
      weightPerBag,
      notes,
      operatorSignature
    } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Verify shipment is ready for weighing
    const qcPassed = shipment.qualityControl?.status === 'PASSED';
    const labPassed = shipment.qualityControl?.sendToLab 
      ? shipment.labAnalysis?.status === 'PASSED' 
      : true;

    if (!qcPassed || !labPassed) {
      return res.status(400).json({
        success: false,
        message: "Shipment must pass QC and Lab checks before weighing"
      });
    }

    // Update weighbridge data
    shipment.weighbridge = {
      weighedBy: req.user.id,
      weighedAt: new Date(),
      grossWeight: parseFloat(grossWeight),
      tareWeight: parseFloat(tareWeight),
      weightPerBag: weightPerBag || 50,
      notes: notes || '',
      OperatorSignature: operatorSignature
    };

    // Update status to pending MD approval
    shipment.currentStatus = 'PENDING_MD_APPROVAL';
    shipment.adminApproval.status = 'PENDING';
    shipment.adminApproval.requestedAt = new Date();

    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('weighbridge.weighedBy', 'name');

    res.status(200).json({
      success: true,
      message: "Weighbridge data submitted successfully. Awaiting MD approval.",
      data: updatedShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting weighbridge data",
      error: error.message
    });
  }
};

// Get today's weighbridge statistics
export const getTodayStatistics = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's weighed shipments
    const todayShipments = await IncomingShipment.find({
      'weighbridge.weighedAt': {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    const trucksWeighed = todayShipments.length;
    
    const totalWeightIn = todayShipments.reduce((sum, shipment) => {
      return sum + (shipment.weighbridge?.grossWeight || 0);
    }, 0);

    const totalWeightOut = todayShipments.reduce((sum, shipment) => {
      return sum + (shipment.weighbridge?.tareWeight || 0);
    }, 0);

    const totalNetWeight = todayShipments.reduce((sum, shipment) => {
      return sum + (shipment.weighbridge?.netWeight || 0);
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        trucksWeighed,
        totalWeightIn,
        totalWeightOut,
        totalNetWeight,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message
    });
  }
};

// Get current active weighing (if any)
export const getActiveWeighing = async (req, res) => {
  try {
    const activeShipment = await IncomingShipment.findOne({
      currentStatus: 'AT_WEIGHBRIDGE'
    })
    .populate('gateEntry.vendor', 'name')
    .populate('gateEntry.enteredBy', 'name')
    .populate('qualityControl.inspectedBy', 'name')
    .populate('labAnalysis.analyzedBy', 'name');

    res.status(200).json({
      success: true,
      data: activeShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active weighing",
      error: error.message
    });
  }
};

// Start weighing a shipment
export const startWeighing = async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Update status to at weighbridge
    shipment.currentStatus = 'AT_WEIGHBRIDGE';
    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('gateEntry.enteredBy', 'name');

    res.status(200).json({
      success: true,
      message: "Weighing started",
      data: updatedShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error starting weighing",
      error: error.message
    });
  }
};