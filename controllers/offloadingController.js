// controllers/offloadingController.js
import IncomingShipment from '../models/incomingShipment.js';

// Get all shipments ready for offloading (MD Approved)
export const getShipmentsReadyForOffloading = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: 'APPROVED'
    })
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('gateEntry.enteredBy', 'fullname username')
    .populate('weighbridge.weighedBy', 'fullname username')
    .populate('adminApproval.approvedBy', 'fullname username')
    .sort({ 'adminApproval.approvedAt': 1 });  // First approved, first offloaded

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

// Get shipments currently being offloaded
export const getShipmentsInOffloading = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: 'OFFLOADING'
    })
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('offloading.offloadedBy', 'fullname username')
    .sort({ 'offloading.startTime': 1 });

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

// Get shipments pending MD approval (for display)
export const getShipmentsPendingApproval = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: 'PENDING_MD_APPROVAL'
    })
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('weighbridge.weighedBy', 'fullname username')
    .sort({ 'weighbridge.weighedAt': 1 });

    console.log(`✅ Found ${shipments.length} shipments pending MD approval`);

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    console.error('❌ Error fetching pending shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending shipments',
      error: error.message
    });
  }
};

// Start offloading process
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

    if (shipment.currentStatus !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `Shipment is not ready for offloading. Current status: ${shipment.currentStatus}`
      });
    }

    // Update to offloading status
    shipment.currentStatus = 'OFFLOADING';
    shipment.offloading.offloadedBy = req.user?.id || req.user?._id;
    shipment.offloading.startTime = new Date();

    await shipment.save();

    // Populate for response
    await shipment.populate('offloading.offloadedBy', 'fullname username email');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson');

    console.log(`✅ Started offloading for shipment ${shipment.shipmentNumber}`);

    res.status(200).json({
      success: true,
      message: 'Offloading process started',
      data: shipment
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

// Complete offloading process
export const completeOffloading = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      actualBagsCounted,
      storageLocation,
      condition,
      damageReport,
      notes
    } = req.body;

    // Validate required fields
    if (!actualBagsCounted || !storageLocation || !condition) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: actualBagsCounted, storageLocation, condition'
      });
    }

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.currentStatus !== 'OFFLOADING') {
      return res.status(400).json({
        success: false,
        message: `Shipment is not in offloading status. Current status: ${shipment.currentStatus}`
      });
    }

    // Update offloading details
    shipment.offloading.endTime = new Date();
    shipment.offloading.actualBagsCounted = Number(actualBagsCounted);
    shipment.offloading.storageLocation = storageLocation;
    shipment.offloading.condition = condition;
    shipment.offloading.damageReport = damageReport || '';
    shipment.offloading.notes = notes || '';
    shipment.offloading.completed = true;
    shipment.offloading.inventoryUpdated = true;  // Mark as ready for inventory update
    
    // Update status to completed
    shipment.currentStatus = 'COMPLETED';

    await shipment.save();

    // Populate for response
    await shipment.populate('offloading.offloadedBy', 'fullname username email');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson');

    // Calculate offloading duration
    const duration = Math.round(
      (shipment.offloading.endTime - shipment.offloading.startTime) / 1000 / 60
    ); // in minutes

    console.log(`✅ Completed offloading for shipment ${shipment.shipmentNumber}`);
    console.log(`   Duration: ${duration} minutes`);
    console.log(`   Actual bags counted: ${actualBagsCounted}`);
    console.log(`   Storage location: ${storageLocation}`);

    res.status(200).json({
      success: true,
      message: 'Offloading completed successfully',
      data: shipment,
      offloadingDuration: duration
    });
  } catch (error) {
    console.error('❌ Error completing offloading:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing offloading',
      error: error.message
    });
  }
};

// Get completed shipments (for history/records)
export const getCompletedShipments = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const shipments = await IncomingShipment.find({
      currentStatus: 'COMPLETED'
    })
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('offloading.offloadedBy', 'fullname username')
    .sort({ 'offloading.offloadedAt': -1 })
    .limit(limit);

    console.log(`✅ Retrieved ${shipments.length} completed shipments`);

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    console.error('❌ Error fetching completed shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching completed shipments',
      error: error.message
    });
  }
};

// Get offloading statistics
export const getOffloadingStatistics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      readyForOffload,
      currentlyOffloading,
      completedToday,
      pendingApproval
    ] = await Promise.all([
      IncomingShipment.countDocuments({ currentStatus: 'APPROVED' }),
      IncomingShipment.countDocuments({ currentStatus: 'OFFLOADING' }),
      IncomingShipment.countDocuments({
        currentStatus: 'COMPLETED',
        'offloading.offloadedAt': { $gte: today }
      }),
      IncomingShipment.countDocuments({ currentStatus: 'PENDING_MD_APPROVAL' })
    ]);

    // Get total bags offloaded today
    const todayOffloaded = await IncomingShipment.aggregate([
      {
        $match: {
          currentStatus: 'COMPLETED',
          'offloading.offloadedAt': { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalBags: { $sum: '$offloading.actualBagsCounted' }
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
        pendingApproval,
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