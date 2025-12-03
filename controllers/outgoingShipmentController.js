// controllers/outgoingShipmentController.js
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

// Create new outgoing shipment
export const createOutgoingShipment = async (req, res) => {
  try {
    console.log('📦 Creating outgoing shipment');
    console.log('Body:', req.body);

    const {
      customer,
      driverName,
      driverPhone,
      truckPlateNumber,
      items,
      destination,
      deliveryNoteNumber,
      waybillNumber,
      notes
    } = req.body;

    // Validate required fields
    if (!customer || !driverName || !driverPhone || !truckPlateNumber || !items || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const shipmentNumber = await generateShipmentNumber();

    const shipmentData = {
      shipmentNumber,
      releasedBy: req.user?.id || req.user?._id,
      releasedAt: new Date(),
      customer,
      driverName,
      driverPhone,
      truckPlateNumber: truckPlateNumber.toUpperCase(),
      items,
      destination,
      deliveryNoteNumber,
      waybillNumber,
      notes,
      status: 'Pending MD Approval',
      mdApproval: {
        status: 'PENDING',
        requestedAt: new Date()
      }
    };

    const shipment = new OutgoingShipment(shipmentData);
    await shipment.save();

    // Populate customer info
    await shipment.populate('customer', 'companyName contactPerson phone');
    await shipment.populate('releasedBy', 'name email');

    console.log('✅ Outgoing shipment created:', shipment._id);
    res.status(201).json({
      success: true,
      message: 'Outgoing shipment created and pending MD approval',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Create outgoing shipment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create outgoing shipment'
    });
  }
};

// Get all outgoing shipments
export const getOutgoingShipments = async (req, res) => {
  try {
    const { status, customer, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (customer) filter.customer = customer;

    const shipments = await OutgoingShipment.find(filter)
      .populate('customer', 'companyName contactPerson phone')
      .populate('releasedBy', 'name email')
      .populate('mdApproval.approvedBy mdApproval.rejectedBy', 'name email')
      .populate('gateOut.verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: shipments });
  } catch (error) {
    console.error('❌ Get outgoing shipments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single outgoing shipment
export const getOutgoingShipmentById = async (req, res) => {
  try {
    const shipment = await OutgoingShipment.findById(req.params.id)
      .populate('customer', 'companyName contactPerson phone email')
      .populate('releasedBy', 'name email')
      .populate('mdApproval.approvedBy mdApproval.rejectedBy', 'name email')
      .populate('loadedBy', 'name email')
      .populate('gateOut.verifiedBy', 'name email');

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    res.json({ success: true, data: shipment });
  } catch (error) {
    console.error('❌ Get outgoing shipment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// MD Approval
export const updateMDApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, rejectionReason } = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (status === 'APPROVED') {
      shipment.mdApproval.status = 'APPROVED';
      shipment.mdApproval.approvedBy = req.user?.id || req.user?._id;
      shipment.mdApproval.approvedAt = new Date();
      shipment.mdApproval.notes = notes;
      shipment.status = 'MD Approved';
    } else if (status === 'REJECTED') {
      shipment.mdApproval.status = 'REJECTED';
      shipment.mdApproval.rejectedBy = req.user?.id || req.user?._id;
      shipment.mdApproval.rejectedAt = new Date();
      shipment.mdApproval.rejectionReason = rejectionReason;
      shipment.status = 'Draft';
    }

    await shipment.save();

    res.json({
      success: true,
      message: `Shipment ${status.toLowerCase()} successfully`,
      data: shipment
    });
  } catch (error) {
    console.error('❌ Update MD approval error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Start loading
export const startLoading = async (req, res) => {
  try {
    const shipment = await OutgoingShipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    shipment.status = 'Loading';
    shipment.loadingStartedAt = new Date();
    shipment.loadedBy = req.user?.id || req.user?._id;

    await shipment.save();

    res.json({
      success: true,
      message: 'Loading started',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Start loading error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complete loading
export const completeLoading = async (req, res) => {
  try {
    const shipment = await OutgoingShipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    shipment.status = 'Loaded';
    shipment.loadedAt = new Date();

    await shipment.save();

    res.json({
      success: true,
      message: 'Loading completed, ready for gate out verification',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Complete loading error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Gate out verification (Security counts bags)
export const updateGateOutVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { bagsCounted, truckCondition, sealNumber, securityNotes } = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    shipment.gateOut = {
      verifiedBy: req.user?.id || req.user?._id,
      verifiedAt: new Date(),
      bagsCounted: Number(bagsCounted),
      countMatch: Number(bagsCounted) === shipment.totalBags,
      truckCondition,
      sealNumber,
      securityNotes
    };

    shipment.status = 'Gate Out Verification';
    shipment.gateOutVerifiedAt = new Date();
    shipment.gateOutVerifiedBy = req.user?.id || req.user?._id;

    await shipment.save();

    res.json({
      success: true,
      message: 'Gate out verification completed',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Gate out verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Gate out (Truck leaves)
export const gateOut = async (req, res) => {
  try {
    const shipment = await OutgoingShipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    shipment.status = 'Gate Out';
    shipment.gateOutAt = new Date();
    shipment.gateOutBy = req.user?.id || req.user?._id;

    await shipment.save();

    res.json({
      success: true,
      message: 'Truck has left the premises',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Gate out error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark in transit
export const markInTransit = async (req, res) => {
  try {
    const shipment = await OutgoingShipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    shipment.status = 'In Transit';
    await shipment.save();

    res.json({
      success: true,
      message: 'Shipment marked as in transit',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Mark in transit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark delivered
export const markDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualBagsReceived, issues, customerSignature } = req.body;

    const shipment = await OutgoingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    shipment.status = actualBagsReceived < shipment.totalBags ? 'Short-Landed' : 'Delivered';
    shipment.deliveredAt = new Date();
    shipment.actualBagsReceived = Number(actualBagsReceived);
    shipment.issues = issues;
    shipment.customerSignature = customerSignature;

    await shipment.save();

    res.json({
      success: true,
      message: 'Shipment marked as delivered',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Mark delivered error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete outgoing shipment
export const deleteOutgoingShipment = async (req, res) => {
  try {
    const shipment = await OutgoingShipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    await OutgoingShipment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Shipment deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete shipment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get dashboard stats
export const getOutgoingStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalToday,
      pendingApproval,
      approved,
      loading,
      loaded,
      gateOutVerification,
      inTransit,
      delivered
    ] = await Promise.all([
      OutgoingShipment.countDocuments({ createdAt: { $gte: today } }),
      OutgoingShipment.countDocuments({ status: 'Pending MD Approval' }),
      OutgoingShipment.countDocuments({ status: 'MD Approved' }),
      OutgoingShipment.countDocuments({ status: 'Loading' }),
      OutgoingShipment.countDocuments({ status: 'Loaded' }),
      OutgoingShipment.countDocuments({ status: 'Gate Out Verification' }),
      OutgoingShipment.countDocuments({ status: 'In Transit' }),
      OutgoingShipment.countDocuments({ status: 'Delivered', createdAt: { $gte: today } })
    ]);

    res.json({
      success: true,
      data: {
        totalToday,
        pendingApproval,
        approved,
        loading,
        loaded,
        gateOutVerification,
        inTransit,
        delivered
      }
    });
  } catch (error) {
    console.error('❌ Get outgoing stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};