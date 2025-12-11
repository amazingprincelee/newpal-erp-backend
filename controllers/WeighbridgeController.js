// controllers/weighbridgeController.js - UPDATED TO MATCH NEW WORKFLOW
import IncomingShipment from "../models/incomingShipment.js";

// ========== STAGE 5: GET SHIPMENTS AWAITING GROSS WEIGHT ==========
// These are trucks that passed QC/Lab and need to be weighed WITH load
export const getShipmentsAwaitingGrossWeight = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: { $in: ['QC_PASSED', 'LAB_PASSED', 'AT_WEIGHBRIDGE_GROSS'] }
    })
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('gateEntry.enteredBy', 'fullname username email')
    .populate('qualityControl.inspectedBy', 'fullname username email')
    .populate('labAnalysis.analyzedBy', 'fullname username email')
    .sort({ 'gateEntry.enteredAt': 1 }); // FIFO

    console.log(`✅ Found ${shipments.length} shipments awaiting gross weight`);

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    console.error('❌ Error fetching shipments awaiting gross weight:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching shipments awaiting gross weight",
      error: error.message
    });
  }
};

// ========== STAGE 8: GET SHIPMENTS AWAITING TARE WEIGHT ==========
// These are trucks that completed offloading and need to be weighed EMPTY
export const getShipmentsAwaitingTareWeight = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: { $in: ['OFFLOADING_COMPLETE', 'AT_WEIGHBRIDGE_TARE'] }
    })
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('gateEntry.enteredBy', 'fullname username email')
    .populate('offloadReports.qcStockKeeperReport.submittedBy', 'fullname username email')
    .populate('offloadReports.warehouseReport.submittedBy', 'fullname username email')
    .populate('offloadReports.securityReport.submittedBy', 'fullname username email')
    .sort({ 'gateEntry.enteredAt': 1 }); // FIFO

    console.log(`✅ Found ${shipments.length} shipments awaiting tare weight`);

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    console.error('❌ Error fetching shipments awaiting tare weight:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching shipments awaiting tare weight",
      error: error.message
    });
  }
};

// Get specific shipment for weighing
export const getShipmentForWeighing = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('gateEntry.enteredBy', 'fullname username email')
      .populate('qualityControl.inspectedBy', 'fullname username email')
      .populate('labAnalysis.analyzedBy', 'fullname username email')
      .populate('weighbridge.grossWeighedBy', 'fullname username email')
      .populate('weighbridge.tareWeighedBy', 'fullname username email')
      .populate('offloadReports.qcStockKeeperReport.submittedBy', 'fullname username email')
      .populate('offloadReports.warehouseReport.submittedBy', 'fullname username email')
      .populate('offloadReports.securityReport.submittedBy', 'fullname username email');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    console.log(`✅ Retrieved shipment ${shipment.shipmentNumber} for weighing`);

    res.status(200).json({
      success: true,
      data: shipment
    });
  } catch (error) {
    console.error('❌ Error fetching shipment:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching shipment",
      error: error.message
    });
  }
};

// ========== STAGE 5: SUBMIT GROSS WEIGHT (Full Truck) ==========
export const submitGrossWeight = async (req, res) => {
  try {
    const { id } = req.params;
    const { grossWeight, notes } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Verify shipment is ready for gross weighing
    const validStatuses = ['QC_PASSED', 'LAB_PASSED', 'AT_WEIGHBRIDGE_GROSS'];
    if (!validStatuses.includes(shipment.currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Shipment must pass QC/Lab before gross weighing. Current status: ${shipment.currentStatus}`
      });
    }

    // Validation
    if (!grossWeight || parseFloat(grossWeight) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid gross weight is required"
      });
    }

    // Update gross weight data
    shipment.weighbridge.grossWeight = parseFloat(grossWeight);
    shipment.weighbridge.grossWeighedBy = req.user?.id || req.user?._id;
    shipment.weighbridge.grossWeighedAt = new Date();
    if (notes) shipment.weighbridge.notes = notes;

    // Update status - moves to Stage 5 complete
    shipment.currentStatus = 'WEIGHBRIDGE_GROSS_RECORDED';

    await shipment.save();

    // Auto-move to pending MD approval #2 (Pre-Offload)
    shipment.currentStatus = 'PENDING_MD_APPROVAL_2';
    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('weighbridge.grossWeighedBy', 'fullname username email');

    console.log(`✅ Gross weight recorded for ${shipment.shipmentNumber}: ${grossWeight} kg`);

    res.status(200).json({
      success: true,
      message: "Gross weight recorded successfully. Sent to MD for pre-offload approval.",
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error submitting gross weight:', error);
    res.status(500).json({
      success: false,
      message: "Error submitting gross weight",
      error: error.message
    });
  }
};

// ========== STAGE 8: SUBMIT TARE WEIGHT (Empty Truck) ==========
export const submitTareWeight = async (req, res) => {
  try {
    const { id } = req.params;
    const { tareWeight, notes, operatorSignature } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Verify shipment completed offloading
    if (shipment.currentStatus !== 'OFFLOADING_COMPLETE' && 
        shipment.currentStatus !== 'AT_WEIGHBRIDGE_TARE') {
      return res.status(400).json({
        success: false,
        message: `Offloading must be complete before tare weighing. Current status: ${shipment.currentStatus}`
      });
    }

    // Validation
    if (!tareWeight || parseFloat(tareWeight) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid tare weight is required"
      });
    }

    // Ensure gross weight exists
    if (!shipment.weighbridge.grossWeight) {
      return res.status(400).json({
        success: false,
        message: "Gross weight must be recorded before tare weight"
      });
    }

    // Validate tare is less than gross
    if (parseFloat(tareWeight) >= shipment.weighbridge.grossWeight) {
      return res.status(400).json({
        success: false,
        message: "Tare weight must be less than gross weight"
      });
    }

    // Update tare weight data
    shipment.weighbridge.tareWeight = parseFloat(tareWeight);
    shipment.weighbridge.tareWeighedBy = req.user?.id || req.user?._id;
    shipment.weighbridge.tareWeighedAt = new Date();
    if (notes) shipment.weighbridge.notes = notes;
    if (operatorSignature) shipment.weighbridge.operatorSignature = operatorSignature;

    // Update status - moves to Stage 8 complete
    shipment.currentStatus = 'WEIGHBRIDGE_TARE_RECORDED';

    await shipment.save();

    // Auto-move to pending MD approval #3 (Final Exit)
    shipment.currentStatus = 'PENDING_MD_APPROVAL_3';
    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('weighbridge.grossWeighedBy', 'fullname username email')
      .populate('weighbridge.tareWeighedBy', 'fullname username email')
      .populate('offloadReports.securityReport.submittedBy', 'fullname username email');

    console.log(`✅ Tare weight recorded for ${shipment.shipmentNumber}: ${tareWeight} kg`);
    console.log(`   Net Weight: ${updatedShipment.weighbridge.netWeight} kg`);
    console.log(`   Average per bag: ${updatedShipment.weighbridge.averageWeightPerBag?.toFixed(2)} kg`);

    res.status(200).json({
      success: true,
      message: "Tare weight recorded successfully. Final calculations completed. Sent to MD for final exit approval.",
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error submitting tare weight:', error);
    res.status(500).json({
      success: false,
      message: "Error submitting tare weight",
      error: error.message
    });
  }
};

// Start gross weighing
export const startGrossWeighing = async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Verify shipment passed QC/Lab
    const validStatuses = ['QC_PASSED', 'LAB_PASSED'];
    if (!validStatuses.includes(shipment.currentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Shipment must pass QC/Lab before weighing"
      });
    }

    // Update status to at weighbridge for gross
    shipment.currentStatus = 'AT_WEIGHBRIDGE_GROSS';
    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('gateEntry.enteredBy', 'fullname username email');

    console.log(`✅ Gross weighing started for ${shipment.shipmentNumber}`);

    res.status(200).json({
      success: true,
      message: "Gross weighing started",
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error starting gross weighing:', error);
    res.status(500).json({
      success: false,
      message: "Error starting gross weighing",
      error: error.message
    });
  }
};

// Start tare weighing
export const startTareWeighing = async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Verify offloading is complete
    if (shipment.currentStatus !== 'OFFLOADING_COMPLETE') {
      return res.status(400).json({
        success: false,
        message: "Offloading must be complete before tare weighing"
      });
    }

    // Update status to at weighbridge for tare
    shipment.currentStatus = 'AT_WEIGHBRIDGE_TARE';
    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('gateEntry.enteredBy', 'fullname username email');

    console.log(`✅ Tare weighing started for ${shipment.shipmentNumber}`);

    res.status(200).json({
      success: true,
      message: "Tare weighing started",
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error starting tare weighing:', error);
    res.status(500).json({
      success: false,
      message: "Error starting tare weighing",
      error: error.message
    });
  }
};

// Get active weighing (both gross and tare)
export const getActiveWeighing = async (req, res) => {
  try {
    const activeShipment = await IncomingShipment.findOne({
      currentStatus: { $in: ['AT_WEIGHBRIDGE_GROSS', 'AT_WEIGHBRIDGE_TARE'] }
    })
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('gateEntry.enteredBy', 'fullname username email')
    .populate('qualityControl.inspectedBy', 'fullname username email')
    .populate('labAnalysis.analyzedBy', 'fullname username email')
    .populate('weighbridge.grossWeighedBy', 'fullname username email')
    .populate('weighbridge.tareWeighedBy', 'fullname username email');

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

// Get today's weighbridge statistics
export const getTodayStatistics = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's gross weights
    const todayGrossWeights = await IncomingShipment.find({
      'weighbridge.grossWeighedAt': {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // Get today's tare weights (completed weighings)
    const todayTareWeights = await IncomingShipment.find({
      'weighbridge.tareWeighedAt': {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    const grossWeightsRecorded = todayGrossWeights.length;
    const tareWeightsRecorded = todayTareWeights.length;
    
    const totalGrossWeight = todayGrossWeights.reduce((sum, shipment) => {
      return sum + (shipment.weighbridge?.grossWeight || 0);
    }, 0);

    const totalTareWeight = todayTareWeights.reduce((sum, shipment) => {
      return sum + (shipment.weighbridge?.tareWeight || 0);
    }, 0);

    const totalNetWeight = todayTareWeights.reduce((sum, shipment) => {
      return sum + (shipment.weighbridge?.netWeight || 0);
    }, 0);

    const totalBagsWeighed = todayTareWeights.reduce((sum, shipment) => {
      return sum + (shipment.weighbridge?.numberOfAcceptedBags || 0);
    }, 0);

    console.log(`✅ Weighbridge statistics: Gross: ${grossWeightsRecorded}, Tare: ${tareWeightsRecorded}, Net: ${totalNetWeight.toFixed(0)} kg`);

    res.status(200).json({
      success: true,
      data: {
        grossWeightsRecorded,
        tareWeightsRecorded,
        totalGrossWeight: Math.round(totalGrossWeight),
        totalTareWeight: Math.round(totalTareWeight),
        totalNetWeight: Math.round(totalNetWeight),
        totalBagsWeighed,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message
    });
  }
};