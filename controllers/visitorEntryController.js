// controllers/visitorEntryController.js
import VisitorEntry  from '../models/visitorEntry.js';

// Generate unique pass ID
const generatePassId = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await VisitorEntry.countDocuments({
    createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) }
  });
  const number = String(count + 1).padStart(4, '0');
  return `VP-${dateStr}-${number}`;
};

// Create new visitor entry
export const createVisitorEntry = async (req, res) => {
  try {
    console.log('👤 Creating visitor entry');
    console.log('Body:', req.body);

    const {
      entryType,
      visitorName,
      phone,
      visitingWho,
      purposeOfVisit,
      timeIn
    } = req.body;

    // Validate required fields
    if (!entryType || !visitorName || !phone || !visitingWho || !purposeOfVisit || !timeIn) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const visitorData = {
      entryType,
      visitorName,
      phone,
      visitingWho,
      purposeOfVisit,
      timeIn,
      createdBy: req.user?.id || req.user?._id,
      status: 'pending'
    };

    const visitor = new VisitorEntry(visitorData);
    await visitor.save();

    // Populate creator info
    await visitor.populate('createdBy', 'name email');

    console.log('✅ Visitor entry created:', visitor._id);
    res.status(201).json({
      success: true,
      message: 'Visitor entry created successfully',
      data: visitor
    });
  } catch (error) {
    console.error('❌ Create visitor entry error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create visitor entry'
    });
  }
};

// Get all visitor entries
export const getVisitorEntries = async (req, res) => {
  try {
    const { status, entryType, limit = 100 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (entryType) filter.entryType = entryType;

    const visitors = await VisitorEntry.find(filter)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('printedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: visitors });
  } catch (error) {
    console.error('❌ Get visitor entries error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single visitor entry
export const getVisitorEntryById = async (req, res) => {
  try {
    const visitor = await VisitorEntry.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('printedBy', 'name email');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor entry not found' });
    }

    res.json({ success: true, data: visitor });
  } catch (error) {
    console.error('❌ Get visitor entry error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve visitor entry
export const approveVisitorEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await VisitorEntry.findById(id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor entry not found' });
    }

    if (visitor.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Visitor entry already approved'
      });
    }

    // Generate pass ID
    const passId = await generatePassId();

    visitor.status = 'approved';
    visitor.approved = true;
    visitor.approvedBy = req.user?.id || req.user?._id;
    visitor.approvedAt = new Date();
    visitor.passId = passId;

    await visitor.save();

    // Populate for response
    await visitor.populate('approvedBy createdBy', 'name email');

    console.log('✅ Visitor approved:', visitor._id, 'Pass ID:', passId);
    res.json({
      success: true,
      message: 'Visitor approved successfully',
      data: visitor
    });
  } catch (error) {
    console.error('❌ Approve visitor error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Print visitor pass
export const printVisitorPass = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await VisitorEntry.findById(id)
      .populate('createdBy approvedBy', 'name email');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor entry not found' });
    }

    if (visitor.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Visitor must be approved before printing pass'
      });
    }

    // Update print info
    visitor.printedAt = new Date();
    visitor.printedBy = req.user?.id || req.user?._id;
    await visitor.save();

    await visitor.populate('printedBy', 'name email');

    // Generate pass data for printing
    const passData = {
      passId: visitor.passId,
      visitorName: visitor.visitorName,
      phone: visitor.phone,
      entryType: visitor.entryType,
      visitingWho: visitor.visitingWho,
      purposeOfVisit: visitor.purposeOfVisit,
      timeIn: visitor.timeIn,
      approvedBy: visitor.approvedBy?.name,
      approvedAt: visitor.approvedAt,
      printedAt: visitor.printedAt,
      printedBy: visitor.printedBy?.name
    };

    console.log('🖨️ Visitor pass printed:', visitor._id);
    res.json({
      success: true,
      message: 'Pass printed successfully',
      data: visitor,
      passData
    });
  } catch (error) {
    console.error('❌ Print visitor pass error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Record visitor exit
export const recordVisitorExit = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeOut } = req.body;

    const visitor = await VisitorEntry.findById(id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor entry not found' });
    }

    visitor.timeOut = timeOut || new Date().toISOString().slice(11, 16);
    visitor.status = 'exited';

    await visitor.save();

    console.log('✅ Visitor exit recorded:', visitor._id);
    res.json({
      success: true,
      message: 'Visitor exit recorded successfully',
      data: visitor
    });
  } catch (error) {
    console.error('❌ Record visitor exit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel visitor entry
export const cancelVisitorEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await VisitorEntry.findById(id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor entry not found' });
    }

    visitor.status = 'canceled';

    await visitor.save();

    res.json({
      success: true,
      message: 'Visitor entry canceled successfully',
      data: visitor
    });
  } catch (error) {
    console.error('❌ Cancel visitor entry error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete visitor entry
export const deleteVisitorEntry = async (req, res) => {
  try {
    const visitor = await VisitorEntry.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor entry not found' });
    }

    await VisitorEntry.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Visitor entry deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete visitor entry error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get visitor stats
export const getVisitorStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalToday,
      pending,
      approved,
      inside,
      exited
    ] = await Promise.all([
      VisitorEntry.countDocuments({ createdAt: { $gte: today } }),
      VisitorEntry.countDocuments({ status: 'pending' }),
      VisitorEntry.countDocuments({ status: 'approved', timeOut: null }),
      VisitorEntry.countDocuments({ status: 'approved', timeOut: null }),
      VisitorEntry.countDocuments({ status: 'exited', createdAt: { $gte: today } })
    ]);

    res.json({
      success: true,
      data: {
        totalToday,
        pending,
        approved,
        inside,
        exited
      }
    });
  } catch (error) {
    console.error('❌ Get visitor stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};