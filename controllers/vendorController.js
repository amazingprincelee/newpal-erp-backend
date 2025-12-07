// controllers/vendorController.js
import Vendor from '../models/vendor.js';
import { upload } from '../config/cloudinary.js';

export const createVendor = async (req, res) => {
  try {
    console.log('📦 Received vendor creation request');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    // Parse JSON fields from FormData
    const vendorData = {
      companyName: req.body.companyName,
      tradingName: req.body.tradingName,
      typeOfBusiness: req.body.typeOfBusiness,
      yearEstablished: req.body.yearEstablished,
      rcNumber: req.body.rcNumber,
      tin: req.body.tin,
      registeredAddress: req.body.registeredAddress,
      factoryAddress: req.body.factoryAddress,
      contactPerson: req.body.contactPerson,
      position: req.body.position,
      phone: req.body.phone,
      email: req.body.email,
      website: req.body.website,
      status: 'Pending'
    };

    console.log('Parsed Vendor Data being saved to DB:');
console.table(vendorData);  // This gives a beautiful table in console

console.log('================================================');

    // Parse nested JSON objects
    if (req.body.supplyCategories) {
      vendorData.supplyCategories = JSON.parse(req.body.supplyCategories);
    }
    if (req.body.bankDetails) {
      vendorData.bankDetails = JSON.parse(req.body.bankDetails);
    }
    if (req.body.qualitySafety) {
      vendorData.qualitySafety = JSON.parse(req.body.qualitySafety);
    }

    // Handle file uploads
    vendorData.documents = {};
    
    if (req.files && req.files.documents) {
      const uploadedFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];

      const documentFields = req.body.documentFields 
        ? JSON.parse(req.body.documentFields) 
        : [];

      console.log('📄 Uploading', uploadedFiles.length, 'files to Cloudinary...');

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const fieldName = documentFields[i];
        
        if (file && fieldName) {
          try {
            const result = await upload(file.tempFilePath, 'vendors/documents');
            vendorData.documents[fieldName] = result.secure_url;
            console.log(`✅ Uploaded ${fieldName}`);
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${fieldName}:`, uploadError.message);
            // Continue with other files even if one fails
          }
        }
      }
    }

    console.log('💾 Saving vendor to database...');
    const vendor = new Vendor(vendorData);
    await vendor.save();
    
    console.log('✅ Vendor created successfully:', vendor._id);
    res.status(201).json({ 
      success: true, 
      message: 'Vendor created successfully',
      data: vendor 
    });
  } catch (error) {
    console.error('❌ Create vendor error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create vendor'
    });
  }
};

export const approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    
    vendor.status = 'Approved';
    vendor.approvedBy = req.user?.id || req.user?._id;
    vendor.approvedAt = new Date();
    await vendor.save();
    
    res.json({ 
      success: true, 
      message: 'Vendor approved successfully', 
      data: vendor 
    });
  } catch (error) {
    console.error('❌ Approve vendor error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json({ success: true, data: vendors });
  } catch (error) {
    console.error('❌ Get vendors error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📝 Updating vendor:', id);
    
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Parse JSON fields from FormData
    const updatedData = {
      companyName: req.body.companyName,
      tradingName: req.body.tradingName,
      typeOfBusiness: req.body.typeOfBusiness,
      yearEstablished: req.body.yearEstablished,
      rcNumber: req.body.rcNumber,
      tin: req.body.tin,
      registeredAddress: req.body.registeredAddress,
      factoryAddress: req.body.factoryAddress,
      contactPerson: req.body.contactPerson,
      position: req.body.position,
      phone: req.body.phone,
      email: req.body.email,
      website: req.body.website,
    };

    // Parse nested JSON objects
    if (req.body.supplyCategories) {
      updatedData.supplyCategories = JSON.parse(req.body.supplyCategories);
    }
    if (req.body.bankDetails) {
      updatedData.bankDetails = JSON.parse(req.body.bankDetails);
    }
    if (req.body.qualitySafety) {
      updatedData.qualitySafety = JSON.parse(req.body.qualitySafety);
    }

    // Handle file uploads - merge with existing documents
    if (req.files && req.files.documents) {
      const uploadedFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];

      const documentFields = req.body.documentFields 
        ? JSON.parse(req.body.documentFields) 
        : [];

      updatedData.documents = { ...vendor.documents.toObject() };

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const fieldName = documentFields[i];
        
        if (file && fieldName) {
          try {
            const result = await upload(file.tempFilePath, 'vendors/documents');
            updatedData.documents[fieldName] = result.secure_url;
            console.log(`✅ Updated ${fieldName}`);
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${fieldName}:`, uploadError.message);
          }
        }
      }
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    console.log('✅ Vendor updated successfully');
    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: updatedVendor,
    });
  } catch (error) {
    console.error('❌ Update vendor error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    await Vendor.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      message: 'Vendor deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete vendor error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};