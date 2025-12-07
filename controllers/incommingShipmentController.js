// controllers/incomingShipmentController.js
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

// Create new incoming shipment (Gate Entry)
export const createIncomingShipment = async (req, res) => {
  try {
    console.log('📦 Creating incoming shipment');
    console.log('Body:', req.body);

    const {
      vendor,
      driverName,
      driverPhone,
      truckPlateNumber,
      waybillNumber,
      declaredBags,
      productType,
      origin,
      securityBagCount,
      notes
    } = req.body;

    // Validate required fields
    if (!vendor || !driverName || !driverPhone || !truckPlateNumber || !declaredBags || !productType || !origin) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const shipmentNumber = await generateShipmentNumber();

    const shipmentData = {
      shipmentNumber,
      gateEntry: {
        enteredBy: req.user?.id || req.user?._id,
        enteredAt: new Date(),
        vendor,
        driverName,
        driverPhone,
        truckPlateNumber: truckPlateNumber.toUpperCase(),
        waybillNumber,
        declaredBags: Number(declaredBags),
        productType,
        origin,
        securityBagCount: securityBagCount ? Number(securityBagCount) : null,
        securityCountedBy: securityBagCount ? (req.user?.id || req.user?._id) : null,
        bagCountMatch: securityBagCount ? Number(securityBagCount) === Number(declaredBags) : null,
        notes
      },
      currentStatus: securityBagCount ? 'SECURITY_COUNTED' : 'AT_GATE'
    };

    const shipment = new IncomingShipment(shipmentData);
    await shipment.save();

    // Populate vendor info
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson phone');
    await shipment.populate('gateEntry.enteredBy', 'fullname username email');
    if (securityBagCount) {
      await shipment.populate('gateEntry.securityCountedBy', 'fullname username role');
    }

    console.log('✅ Incoming shipment created:', shipment._id);
    res.status(201).json({
      success: true,
      message: securityBagCount 
        ? 'Shipment entry created with security count' 
        : 'Shipment entry created and sent to Security',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Create incoming shipment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create incoming shipment'
    });
  }
};

// Get all incoming shipments
export const getIncomingShipments = async (req, res) => {
  try {
    const { status, vendor, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.currentStatus = status;
    if (vendor) filter['gateEntry.vendor'] = vendor;

    const shipments = await IncomingShipment.find(filter)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('gateEntry.enteredBy', 'fullname username email')
      .populate('gateEntry.securityCountedBy', 'fullname username role')
      .populate('qualityControl.inspectedBy', 'fullname username email')
      .populate('labAnalysis.analyzedBy', 'fullname username email')
      .populate('weighbridge.weighedBy', 'fullname username email')
      .populate('adminApproval.approvedBy adminApproval.rejectedBy', 'fullname username email')
      .populate('offloading.offloadedBy', 'fullname username email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: shipments });
  } catch (error) {
    console.error('❌ Get incoming shipments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single incoming shipment
export const getIncomingShipmentById = async (req, res) => {
  try {
    const shipment = await IncomingShipment.findById(req.params.id)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('gateEntry.enteredBy', 'fullname username email')
      .populate('gateEntry.securityCountedBy', 'fullname username role')
      .populate('qualityControl.inspectedBy', 'fullname username email')
      .populate('labAnalysis.analyzedBy', 'fullname username email')
      .populate('weighbridge.weighedBy', 'fullname username email')
      .populate('adminApproval.approvedBy adminApproval.rejectedBy', 'fullname username email')
      .populate('offloading.offloadedBy', 'fullname username email');

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    res.json({ success: true, data: shipment });
  } catch (error) {
    console.error('❌ Get incoming shipment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update security bag count - 🔥 AUTO-SEND TO QC AFTER COUNT
export const updateSecurityCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { securityBagCount } = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    // Validate security bag count
    if (!securityBagCount || securityBagCount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid security bag count is required' 
      });
    }

    // Update security count with user information
    shipment.gateEntry.securityBagCount = Number(securityBagCount);
    shipment.gateEntry.securityCountedBy = req.user?.id || req.user?._id;
    shipment.gateEntry.bagCountMatch = Number(securityBagCount) === shipment.gateEntry.declaredBags;
    
    // 🔥 AUTOMATICALLY SEND TO QC AFTER SECURITY COUNT
    shipment.currentStatus = 'IN_QC';
    
    await shipment.save();

    // Populate all relevant fields
    await shipment.populate('gateEntry.securityCountedBy', 'fullname username role');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson phone');
    await shipment.populate('gateEntry.enteredBy', 'fullname username email');

    console.log(`✅ Security count updated by ${req.user?.fullname || req.user?.username}`);
    console.log(`✅ Shipment ${shipment.shipmentNumber} automatically sent to QC`);

    res.json({
      success: true,
      message: 'Security count recorded and shipment sent to QC',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Update security count error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update QC inspection
export const updateQCInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const qcData = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    // Ensure shipment is in QC stage
    if (shipment.currentStatus !== 'IN_QC') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be in QC stage for inspection' 
      });
    }

    shipment.qualityControl = {
      ...qcData,
      inspectedBy: req.user?.id || req.user?._id,
      inspectedAt: new Date()
    };

    // Update status based on QC result
    if (qcData.sendToLab) {
      shipment.currentStatus = 'IN_LAB';
      shipment.qualityControl.status = 'SENT_TO_LAB';
    } else if (qcData.status === 'PASSED') {
      shipment.currentStatus = 'AT_WEIGHBRIDGE';
      shipment.qualityControl.status = 'PASSED';
    } else if (qcData.status === 'FAILED') {
      shipment.currentStatus = 'REJECTED';
      shipment.qualityControl.status = 'FAILED';
    }

    await shipment.save();

    // Populate for response
    await shipment.populate('qualityControl.inspectedBy', 'fullname username email');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson phone');

    console.log(`✅ QC inspection completed for ${shipment.shipmentNumber}: ${shipment.qualityControl.status}`);

    res.json({
      success: true,
      message: 'QC inspection completed successfully',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Update QC inspection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update lab analysis
export const updateLabAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const labData = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    // Ensure shipment is in LAB stage
    if (shipment.currentStatus !== 'IN_LAB') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be in LAB stage for analysis' 
      });
    }

    shipment.labAnalysis = {
      ...labData,
      analyzedBy: req.user?.id || req.user?._id,
      analyzedAt: new Date()
    };

    // Update status based on lab result
    if (labData.status === 'PASSED') {
      shipment.currentStatus = 'AT_WEIGHBRIDGE';
    } else {
      shipment.currentStatus = 'REJECTED';
    }

    await shipment.save();

    await shipment.populate('labAnalysis.analyzedBy', 'fullname username email');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson phone');

    console.log(`✅ Lab analysis completed for ${shipment.shipmentNumber}: ${labData.status}`);

    res.json({
      success: true,
      message: 'Lab analysis completed successfully',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Update lab analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update weighbridge data
export const updateWeighbridge = async (req, res) => {
  try {
    const { id } = req.params;
    const { grossWeight, tareWeight, notes } = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    // Ensure shipment is at weighbridge stage
    if (shipment.currentStatus !== 'AT_WEIGHBRIDGE') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be at weighbridge stage' 
      });
    }

    shipment.weighbridge = {
      weighedBy: req.user?.id || req.user?._id,
      weighedAt: new Date(),
      grossWeight: Number(grossWeight),
      tareWeight: Number(tareWeight),
      notes
    };

    shipment.currentStatus = 'PENDING_MD_APPROVAL';
    shipment.adminApproval.requestedAt = new Date();

    await shipment.save();

    await shipment.populate('weighbridge.weighedBy', 'fullname username email');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson phone');

    console.log(`✅ Weighbridge data recorded for ${shipment.shipmentNumber}`);
    console.log(`   Net Weight: ${shipment.weighbridge.netWeight} kg`);
    console.log(`   Calculated Bags: ${shipment.weighbridge.calculatedBags}`);

    res.json({
      success: true,
      message: 'Weighbridge data recorded successfully',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Update weighbridge error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// MD Approval
export const updateMDApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, rejectionReason } = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    // Ensure shipment is pending approval
    if (shipment.currentStatus !== 'PENDING_MD_APPROVAL') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be pending approval' 
      });
    }

    if (status === 'APPROVED') {
      shipment.adminApproval.status = 'APPROVED';
      shipment.adminApproval.approvedBy = req.user?.id || req.user?._id;
      shipment.adminApproval.approvedAt = new Date();
      shipment.adminApproval.notes = notes;
      shipment.currentStatus = 'APPROVED';
    } else if (status === 'REJECTED') {
      shipment.adminApproval.status = 'REJECTED';
      shipment.adminApproval.rejectedBy = req.user?.id || req.user?._id;
      shipment.adminApproval.rejectedAt = new Date();
      shipment.adminApproval.rejectionReason = rejectionReason;
      shipment.currentStatus = 'REJECTED';
    }

    await shipment.save();

    await shipment.populate('adminApproval.approvedBy adminApproval.rejectedBy', 'fullname username email');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson phone');

    console.log(`✅ Shipment ${shipment.shipmentNumber} ${status.toLowerCase()} by MD`);

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

// Update offloading
export const updateOffloading = async (req, res) => {
  try {
    const { id } = req.params;
    const offloadingData = req.body;

    const shipment = await IncomingShipment.findById(id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    // Ensure shipment is approved
    if (shipment.currentStatus !== 'APPROVED' && shipment.currentStatus !== 'OFFLOADING') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipment must be approved before offloading' 
      });
    }

    shipment.offloading = {
      ...offloadingData,
      offloadedBy: req.user?.id || req.user?._id,
      offloadedAt: new Date()
    };

    if (offloadingData.completed) {
      shipment.currentStatus = 'COMPLETED';
      shipment.offloading.completed = true;
    } else {
      shipment.currentStatus = 'OFFLOADING';
    }

    await shipment.save();

    await shipment.populate('offloading.offloadedBy', 'fullname username email');
    await shipment.populate('gateEntry.vendor', 'companyName contactPerson phone');

    console.log(`✅ Offloading updated for ${shipment.shipmentNumber}`);

    res.json({
      success: true,
      message: 'Offloading data updated successfully',
      data: shipment
    });
  } catch (error) {
    console.error('❌ Update offloading error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete incoming shipment
export const deleteIncomingShipment = async (req, res) => {
  try {
    const shipment = await IncomingShipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    await IncomingShipment.findByIdAndDelete(req.params.id);

    console.log(`✅ Shipment ${shipment.shipmentNumber} deleted`);

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
export const getIncomingStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalToday,
      atGate,
      securityCounted,
      inQC,
      inLab,
      atWeighbridge,
      pendingApproval,
      approved,
      offloading,
      completed
    ] = await Promise.all([
      IncomingShipment.countDocuments({ createdAt: { $gte: today } }),
      IncomingShipment.countDocuments({ currentStatus: 'AT_GATE' }),
      IncomingShipment.countDocuments({ currentStatus: 'SECURITY_COUNTED' }),
      IncomingShipment.countDocuments({ currentStatus: 'IN_QC' }),
      IncomingShipment.countDocuments({ currentStatus: 'IN_LAB' }),
      IncomingShipment.countDocuments({ currentStatus: 'AT_WEIGHBRIDGE' }),
      IncomingShipment.countDocuments({ currentStatus: 'PENDING_MD_APPROVAL' }),
      IncomingShipment.countDocuments({ currentStatus: 'APPROVED' }),
      IncomingShipment.countDocuments({ currentStatus: 'OFFLOADING' }),
      IncomingShipment.countDocuments({ currentStatus: 'COMPLETED' })
    ]);

    res.json({
      success: true,
      data: {
        totalToday,
        atGate,
        securityCounted,
        inQC,
        inLab,
        atWeighbridge,
        pendingApproval,
        approved,
        offloading,
        completed
      }
    });
  } catch (error) {
    console.error('❌ Get incoming stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};