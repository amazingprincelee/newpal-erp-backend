// controllers/vendorController.js
import Vendor from '../models/vendor.js';

export const createVendor = async (req, res) => {
  try {
    const vendor = new Vendor({
      ...req.body,
      status: 'Pending'
    });
    await vendor.save();
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    vendor.status = 'Approved';
    vendor.approvedBy = req.user.id;
    vendor.approvedAt = new Date();
    await vendor.save();
    res.json({ success: true, message: 'Vendor approved', data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json({ success: true, data: vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// EDIT / UPDATE VENDOR
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the vendor
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // OPTIONAL: Only allow editing if status is Pending or Under Review
    // (Remove or adjust this block depending on your business rule)
    if (!['Pending', 'Under Review'].includes(vendor.status)) {
      return res
        .status(400)
        .json({ success: false, message: `Cannot edit vendor with status "${vendor.status}"` });
    }

    // Prevent changing the status via this endpoint (admin uses approve/reject separately)
    if (req.body.status) {
      return res
        .status(400)
        .json({ success: false, message: 'Use dedicated approve/reject endpoints to change status' });
    }

    // If new files are uploaded, req.body will contain the new URLs (handled by your multer/cloudinary middleware)
    const updatedData = {
      ...req.body,
      // Keep the original submittedAt date (or reset if you want)
      // submittedAt remains untouched
    };

    // Merge with existing data (so empty fields don't overwrite with undefined)
    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: updatedVendor,
    });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE VENDOR
export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};