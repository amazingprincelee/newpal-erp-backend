// controllers/offloadingController.js - UPDATED FOR 3 DEPARTMENT REPORTS
import IncomingShipment from '../models/incomingShipment.js';

// ========== GET SHIPMENTS READY FOR OFFLOADING ==========
// These are shipments that got MD Approval #2 (Pre-Offload Approval)
export const getShipmentsReadyForOffloading = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: 'APPROVED_FOR_OFFLOAD'
    })
    .populate('gateEntry.vendor', 'name contactPerson phone')
    .populate('gateEntry.enteredBy', 'name')
    .populate('weighbridge.grossWeighedBy', 'name')
    .populate('mdApprovals.preOffloadApproval.reviewedBy', 'name')
    .sort({ 'mdApprovals.preOffloadApproval.reviewedAt': 1 }); // FIFO

    console.log(`✅ Found ${shipments.length} shipments ready for offloading`);

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    console.error('❌ Error fetching ready shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipments ready for offloading',
      error: error.message
    });
  }
};

// ========== GET SHIPMENTS IN OFFLOADING ==========
export const getShipmentsInOffloading = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: 'OFFLOADING_IN_PROGRESS'
    })
    .populate('gateEntry.vendor', 'name contactPerson phone')
    .populate('offloadReports.qcStockKeeperReport.submittedBy', 'name')
    .populate('offloadReports.warehouseReport.submittedBy', 'name')
    .populate('offloadReports.securityReport.submittedBy', 'name')
    .sort({ updatedAt: 1 });

    console.log(`✅ Found ${shipments.length} shipments in offloading`);

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    console.error('❌ Error fetching offloading shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching offloading shipments',
      error: error.message
    });
  }
};

// ========== START OFFLOADING PROCESS ==========
export const startOffloading = async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.currentStatus !== 'APPROVED_FOR_OFFLOAD') {
      return res.status(400).json({
        success: false,
        message: `Shipment not approved for offload. Current status: ${shipment.currentStatus}`
      });
    }

    // Update to offloading status
    shipment.currentStatus = 'OFFLOADING_IN_PROGRESS';
    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name contactPerson');

    console.log(`✅ Started offloading for shipment ${shipment.shipmentNumber}`);

    res.status(200).json({
      success: true,
      message: 'Offloading process started. Awaiting 3 department reports.',
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error starting offloading:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting offloading',
      error: error.message
    });
  }
};

// ========== SUBMIT QC & STOCK KEEPER REPORT ==========
export const submitQCStockKeeperReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numberOfSampleBags,
      numberOfRejectedBags,
      numberOfAcceptedBags,
      totalBagsAcceptedIntoInventory,
      visualQualityIssues,
      insectsFound,
      pictures,
      qcOfficerSignature,
      stockKeeperSignature
    } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.currentStatus !== 'OFFLOADING_IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Shipment is not in offloading status'
      });
    }

    // Update QC & Stock Keeper report
    shipment.offloadReports.qcStockKeeperReport = {
      submittedBy: req.user?.id || req.user?._id,
      submittedAt: new Date(),
      numberOfSampleBags: Number(numberOfSampleBags),
      numberOfRejectedBags: Number(numberOfRejectedBags),
      numberOfAcceptedBags: Number(numberOfAcceptedBags),
      totalBagsAcceptedIntoInventory: Number(totalBagsAcceptedIntoInventory),
      visualQualityIssues: visualQualityIssues || '',
      insectsFound: insectsFound || { noneFound: true },
      pictures: pictures || [],
      qcOfficer: {
        userId: req.user?.id || req.user?._id,
        signature: qcOfficerSignature,
        signedAt: new Date()
      },
      stockKeeper: {
        userId: req.user?.id || req.user?._id, // Should be different user ideally
        signature: stockKeeperSignature,
        signedAt: new Date()
      },
      completed: true
    };

    // Check if all 3 reports are complete
    await checkAndCompleteOffloading(shipment);

    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('offloadReports.qcStockKeeperReport.submittedBy', 'name');

    console.log(`✅ QC & Stock Keeper report submitted for ${shipment.shipmentNumber}`);

    res.status(200).json({
      success: true,
      message: 'QC & Stock Keeper report submitted successfully',
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error submitting QC & Stock Keeper report:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
      error: error.message
    });
  }
};

// ========== SUBMIT WAREHOUSE REPORT ==========
export const submitWarehouseReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      storageLocation,
      conditionDuringOffload,
      additionalNotes,
      pictures,
      warehouseStaffSignature
    } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.currentStatus !== 'OFFLOADING_IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Shipment is not in offloading status'
      });
    }

    // Update Warehouse report
    shipment.offloadReports.warehouseReport = {
      submittedBy: req.user?.id || req.user?._id,
      submittedAt: new Date(),
      storageLocation,
      conditionDuringOffload,
      additionalNotes: additionalNotes || '',
      pictures: pictures || [],
      warehouseStaff: {
        userId: req.user?.id || req.user?._id,
        signature: warehouseStaffSignature,
        signedAt: new Date()
      },
      completed: true
    };

    // Check if all 3 reports are complete
    await checkAndCompleteOffloading(shipment);

    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('offloadReports.warehouseReport.submittedBy', 'name');

    console.log(`✅ Warehouse report submitted for ${shipment.shipmentNumber}`);

    res.status(200).json({
      success: true,
      message: 'Warehouse report submitted successfully',
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error submitting warehouse report:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
      error: error.message
    });
  }
};

// ========== SUBMIT SECURITY REPORT ==========
export const submitSecurityReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      totalBagsInTruck,
      totalBagsRejected,
      totalBagsAccepted,
      bagCountVerified,
      discrepancyObserved,
      discrepancyDescription,
      additionalNotes,
      pictures,
      securityOfficerBadgeNumber,
      securityOfficerSignature
    } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.currentStatus !== 'OFFLOADING_IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Shipment is not in offloading status'
      });
    }

    // Update Security report
    shipment.offloadReports.securityReport = {
      submittedBy: req.user?.id || req.user?._id,
      submittedAt: new Date(),
      totalBagsInTruck: Number(totalBagsInTruck),
      totalBagsRejected: Number(totalBagsRejected),
      totalBagsAccepted: Number(totalBagsAccepted),
      bagCountVerified: bagCountVerified || false,
      discrepancyObserved: discrepancyObserved || false,
      discrepancyDescription: discrepancyDescription || '',
      additionalNotes: additionalNotes || '',
      pictures: pictures || [],
      securityOfficer: {
        userId: req.user?.id || req.user?._id,
        badgeNumber: securityOfficerBadgeNumber,
        signature: securityOfficerSignature,
        signedAt: new Date()
      },
      completed: true
    };

    // Check if all 3 reports are complete
    await checkAndCompleteOffloading(shipment);

    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('offloadReports.securityReport.submittedBy', 'name');

    console.log(`✅ Security report submitted for ${shipment.shipmentNumber}`);

    res.status(200).json({
      success: true,
      message: 'Security report submitted successfully',
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error submitting security report:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
      error: error.message
    });
  }
};

// ========== HELPER: CHECK IF ALL REPORTS COMPLETE ==========
async function checkAndCompleteOffloading(shipment) {
  const qcComplete = shipment.offloadReports?.qcStockKeeperReport?.completed || false;
  const warehouseComplete = shipment.offloadReports?.warehouseReport?.completed || false;
  const securityComplete = shipment.offloadReports?.securityReport?.completed || false;

  if (qcComplete && warehouseComplete && securityComplete) {
    shipment.currentStatus = 'OFFLOADING_COMPLETE';
    console.log(`✅ All 3 reports complete for ${shipment.shipmentNumber} - Status: OFFLOADING_COMPLETE`);
  }
}

// ========== GET OFFLOADING STATISTICS ==========
export const getOffloadingStatistics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      readyForOffload,
      currentlyOffloading,
      completedToday,
      awaitingTareWeight
    ] = await Promise.all([
      IncomingShipment.countDocuments({ currentStatus: 'APPROVED_FOR_OFFLOAD' }),
      IncomingShipment.countDocuments({ currentStatus: 'OFFLOADING_IN_PROGRESS' }),
      IncomingShipment.countDocuments({
        currentStatus: 'OFFLOADING_COMPLETE',
        'offloadReports.securityReport.submittedAt': { $gte: today }
      }),
      IncomingShipment.countDocuments({ currentStatus: 'OFFLOADING_COMPLETE' })
    ]);

    // Get total bags offloaded today
    const todayOffloaded = await IncomingShipment.aggregate([
      {
        $match: {
          currentStatus: 'OFFLOADING_COMPLETE',
          'offloadReports.securityReport.submittedAt': { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalBags: { $sum: '$offloadReports.securityReport.totalBagsAccepted' }
        }
      }
    ]);

    const totalBagsOffloadedToday = todayOffloaded[0]?.totalBags || 0;

    console.log(`✅ Offloading statistics retrieved`);

    res.status(200).json({
      success: true,
      data: {
        readyForOffload,
        currentlyOffloading,
        completedToday,
        awaitingTareWeight,
        totalBagsOffloadedToday
      }
    });
  } catch (error) {
    console.error('❌ Error fetching offloading statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// ========== GET SHIPMENTS AWAITING TARE WEIGHT ==========
// After offloading complete, they go to weighbridge for tare weight
export const getShipmentsAwaitingTareWeight = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: 'OFFLOADING_COMPLETE'
    })
    .populate('gateEntry.vendor', 'name contactPerson phone')
    .populate('weighbridge.grossWeighedBy', 'name')
    .populate('offloadReports.securityReport.submittedBy', 'name')
    .sort({ 'offloadReports.securityReport.submittedAt': 1 });

    console.log(`✅ Found ${shipments.length} shipments awaiting tare weight`);

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    console.error('❌ Error fetching shipments awaiting tare:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipments',
      error: error.message
    });
  }
};