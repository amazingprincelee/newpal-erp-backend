// controllers/adminApprovalController.js
import IncomingShipment from '../models/incomingShipment.js';
import OutgoingShipment from '../models/outgoingShipment.js';

// ==================== INCOMING SHIPMENTS ====================

// Get all incoming shipments pending MD approval
export const getIncomingPendingApproval = async (req, res) => {
  try {
    const shipments = await IncomingShipment.find({
      currentStatus: 'PENDING_MD_APPROVAL'
    })
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('gateEntry.enteredBy', 'fullname username')
    .populate('gateEntry.securityCountedBy', 'fullname username')
    .populate('qualityControl.inspectedBy', 'fullname username')
    .populate('labAnalysis.analyzedBy', 'fullname username')
    .populate('weighbridge.weighedBy', 'fullname username')
    .sort({ 'weighbridge.weighedAt': 1 });  // First in, first out

    console.log(`✅ Found ${shipments.length} incoming shipments pending MD approval`);

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    console.error('❌ Error fetching incoming pending approval:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching incoming shipments pending approval',
      error: error.message
    });
  }
};

// Get single incoming shipment for approval review
export const getIncomingShipmentForApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'companyName contactPerson phone email')
      .populate('gateEntry.enteredBy', 'fullname username email')
      .populate('gateEntry.securityCountedBy', 'fullname username')
      .populate('qualityControl.inspectedBy', 'fullname username email')
      .populate('labAnalysis.analyzedBy', 'fullname username email')
      .populate('weighbridge.weighedBy', 'fullname username email');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.currentStatus !== 'PENDING_MD_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: `Shipment is not pending approval. Current status: ${shipment.currentStatus}`
      });
    }

    console.log(`✅ Retrieved incoming shipment ${shipment.shipmentNumber} for approval`);

    res.status(200).json({
      success: true,
      data: shipment
    });
  } catch (error) {
    console.error('❌ Error fetching incoming shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipment',
      error: error.message
    });
  }
};

// Approve incoming shipment
export const approveIncomingShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.currentStatus !== 'PENDING_MD_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'Shipment is not pending approval'
      });
    }

    // Update admin approval
    shipment.adminApproval.status = 'APPROVED';
    shipment.adminApproval.approvedBy = req.user?.id || req.user?._id;
    shipment.adminApproval.approvedAt = new Date();
    shipment.adminApproval.notes = notes || '';
    
    // Update current status
    shipment.currentStatus = 'APPROVED';

    await shipment.save();

    // Populate for response
    await shipment.populate('adminApproval.approvedBy', 'fullname username email');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson');

    console.log(`✅ Incoming shipment ${shipment.shipmentNumber} APPROVED by ${req.user?.fullname || req.user?.username}`);

    res.status(200).json({
      success: true,
      message: 'Incoming shipment approved successfully. Ready for offloading.',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Error approving incoming shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving shipment',
      error: error.message
    });
  }
};

// Reject incoming shipment
export const rejectIncomingShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.currentStatus !== 'PENDING_MD_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'Shipment is not pending approval'
      });
    }

    // Update admin approval
    shipment.adminApproval.status = 'REJECTED';
    shipment.adminApproval.rejectedBy = req.user?.id || req.user?._id;
    shipment.adminApproval.rejectedAt = new Date();
    shipment.adminApproval.rejectionReason = rejectionReason;
    
    // Update current status
    shipment.currentStatus = 'REJECTED';

    await shipment.save();

    // Populate for response
    await shipment.populate('adminApproval.rejectedBy', 'fullname username email');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson');

    console.log(`❌ Incoming shipment ${shipment.shipmentNumber} REJECTED by ${req.user?.fullname || req.user?.username}`);
    console.log(`   Reason: ${rejectionReason}`);

    res.status(200).json({
      success: true,
      message: 'Incoming shipment rejected',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Error rejecting incoming shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting shipment',
      error: error.message
    });
  }
};

// ==================== OUTGOING SHIPMENTS ====================

// Get all outgoing shipments pending MD approval
export const getOutgoingPendingApproval = async (req, res) => {
  try {
    const shipments = await OutgoingShipment.find({
      'mdApproval.status': 'PENDING'
    })
    .populate('customer', 'companyName contactPerson phone email')
    .populate('releasedBy', 'fullname username')
    .sort({ 'mdApproval.requestedAt': 1 });

    console.log(`✅ Found ${shipments.length} outgoing shipments pending MD approval`);

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    console.error('❌ Error fetching outgoing pending approval:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching outgoing shipments pending approval',
      error: error.message
    });
  }
};

// Get single outgoing shipment for approval review
export const getOutgoingShipmentForApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await OutgoingShipment.findById(id)
      .populate('customer', 'companyName contactPerson phone email address')
      .populate('releasedBy', 'fullname username email');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.mdApproval.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Shipment is not pending approval. Current status: ${shipment.mdApproval.status}`
      });
    }

    console.log(`✅ Retrieved outgoing shipment for approval`);

    res.status(200).json({
      success: true,
      data: shipment
    });
  } catch (error) {
    console.error('❌ Error fetching outgoing shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipment',
      error: error.message
    });
  }
};

// Approve outgoing shipment
export const approveOutgoingShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const shipment = await OutgoingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.mdApproval.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Shipment is not pending approval'
      });
    }

    // Update MD approval
    shipment.mdApproval.status = 'APPROVED';
    shipment.mdApproval.approvedBy = req.user?.id || req.user?._id;
    shipment.mdApproval.approvedAt = new Date();
    shipment.mdApproval.notes = notes || '';
    
    // Update status (this will trigger the pre-save hook to set status to 'MD Approved')
    shipment.status = 'Pending MD Approval'; // Will be auto-updated to 'MD Approved' by pre-save hook

    await shipment.save();

    // Populate for response
    await shipment.populate('mdApproval.approvedBy', 'fullname username email');
    await shipment.populate('customer', 'companyName contactPerson');

    console.log(`✅ Outgoing shipment APPROVED by ${req.user?.fullname || req.user?.username}`);

    res.status(200).json({
      success: true,
      message: 'Outgoing shipment approved successfully. Ready for loading.',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Error approving outgoing shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving shipment',
      error: error.message
    });
  }
};

// Reject outgoing shipment
export const rejectOutgoingShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const shipment = await OutgoingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    if (shipment.mdApproval.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Shipment is not pending approval'
      });
    }

    // Update MD approval
    shipment.mdApproval.status = 'REJECTED';
    shipment.mdApproval.rejectedBy = req.user?.id || req.user?._id;
    shipment.mdApproval.rejectedAt = new Date();
    shipment.mdApproval.rejectionReason = rejectionReason;
    
    // Update status
    shipment.status = 'Draft'; // Reset to draft for potential resubmission

    await shipment.save();

    // Populate for response
    await shipment.populate('mdApproval.rejectedBy', 'fullname username email');
    await shipment.populate('customer', 'companyName contactPerson');

    console.log(`❌ Outgoing shipment REJECTED by ${req.user?.fullname || req.user?.username}`);
    console.log(`   Reason: ${rejectionReason}`);

    res.status(200).json({
      success: true,
      message: 'Outgoing shipment rejected',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Error rejecting outgoing shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting shipment',
      error: error.message
    });
  }
};

// ==================== STATISTICS ====================

// Get MD dashboard statistics
export const getMDStatistics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      incomingPending,
      incomingApprovedToday,
      incomingRejectedToday,
      outgoingPending,
      outgoingApprovedToday,
      outgoingRejectedToday
    ] = await Promise.all([
      IncomingShipment.countDocuments({ currentStatus: 'PENDING_MD_APPROVAL' }),
      IncomingShipment.countDocuments({
        currentStatus: 'APPROVED',
        'adminApproval.approvedAt': { $gte: today }
      }),
      IncomingShipment.countDocuments({
        currentStatus: 'REJECTED',
        'adminApproval.rejectedAt': { $gte: today }
      }),
      OutgoingShipment.countDocuments({ 'mdApproval.status': 'PENDING' }),
      OutgoingShipment.countDocuments({
        'mdApproval.status': 'APPROVED',
        'mdApproval.approvedAt': { $gte: today }
      }),
      OutgoingShipment.countDocuments({
        'mdApproval.status': 'REJECTED',
        'mdApproval.rejectedAt': { $gte: today }
      })
    ]);

    console.log(`✅ MD Statistics retrieved`);

    res.status(200).json({
      success: true,
      data: {
        incoming: {
          pending: incomingPending,
          approvedToday: incomingApprovedToday,
          rejectedToday: incomingRejectedToday
        },
        outgoing: {
          pending: outgoingPending,
          approvedToday: outgoingApprovedToday,
          rejectedToday: outgoingRejectedToday
        },
        totalPending: incomingPending + outgoingPending,
        totalApprovedToday: incomingApprovedToday + outgoingApprovedToday,
        totalRejectedToday: incomingRejectedToday + outgoingRejectedToday
      }
    });
  } catch (error) {
    console.error('❌ Error fetching MD statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};