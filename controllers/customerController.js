// controllers/customerController.js
import Customer from '../models/customer.js';
import { upload } from '../config/cloudinary.js';

export const createCustomer = async (req, res) => {
  try {
    console.log('📦 Received customer creation request');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    // Parse JSON fields from FormData
    const customerData = {
      companyName: req.body.companyName,
      tradingName: req.body.tradingName,
      typeOfBusiness: req.body.typeOfBusiness,
      yearEstablished: req.body.yearEstablished,
      rcNumber: req.body.rcNumber,
      tin: req.body.tin,
      registeredAddress: req.body.registeredAddress,
      operationalAddress: req.body.operationalAddress,
      contactPerson: req.body.contactPerson,
      position: req.body.position,
      phone: req.body.phone,
      email: req.body.email,
      website: req.body.website,
      otherProducts: req.body.otherProducts,
      monthlyVolume: req.body.monthlyVolume,
      coverageRegions: req.body.coverageRegions,
      outlets: req.body.outlets,
      vehicles: req.body.vehicles,
      warehouseCapacity: req.body.warehouseCapacity,
      distributesOtherBrands: req.body.distributesOtherBrands,
      otherBrands: req.body.otherBrands,
      status: 'Pending'
    };

    // Parse array fields
    if (req.body.businessCategory) {
      customerData.businessCategory = JSON.parse(req.body.businessCategory);
    }
    if (req.body.productsInterested) {
      customerData.productsInterested = JSON.parse(req.body.productsInterested);
    }
    if (req.body.coverageAreas) {
      customerData.coverageAreas = JSON.parse(req.body.coverageAreas);
    }

    // Parse bank details
    if (req.body.bankDetails) {
      customerData.bankDetails = JSON.parse(req.body.bankDetails);
    }

    // Handle file uploads
    customerData.documents = {};
    
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
            const result = await upload(file.tempFilePath, 'customers/documents');
            
            // Handle businessPhotos as array
            if (fieldName === 'businessPhotos') {
              if (!customerData.documents.businessPhotos) {
                customerData.documents.businessPhotos = [];
              }
              customerData.documents.businessPhotos.push(result.secure_url);
            } else {
              customerData.documents[fieldName] = result.secure_url;
            }
            
            console.log(`✅ Uploaded ${fieldName}`);
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${fieldName}:`, uploadError.message);
          }
        }
      }
    }

    console.log('💾 Saving customer to database...');
    const customer = new Customer(customerData);
    await customer.save();
    
    console.log('✅ Customer created successfully:', customer._id);
    res.status(201).json({ 
      success: true, 
      message: 'Customer created successfully',
      data: customer 
    });
  } catch (error) {
    console.error('❌ Create customer error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create customer'
    });
  }
};

export const approveCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    customer.status = 'Approved';
    customer.approvedBy = req.user?.id || req.user?._id;
    customer.approvedAt = new Date();
    await customer.save();
    
    res.json({ 
      success: true, 
      message: 'Customer approved successfully', 
      data: customer 
    });
  } catch (error) {
    console.error('❌ Approve customer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
      .populate('assignedSalesRep', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('❌ Get customers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📝 Updating customer:', id);
    
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Parse JSON fields
    const updatedData = {
      companyName: req.body.companyName,
      tradingName: req.body.tradingName,
      typeOfBusiness: req.body.typeOfBusiness,
      yearEstablished: req.body.yearEstablished,
      rcNumber: req.body.rcNumber,
      tin: req.body.tin,
      registeredAddress: req.body.registeredAddress,
      operationalAddress: req.body.operationalAddress,
      contactPerson: req.body.contactPerson,
      position: req.body.position,
      phone: req.body.phone,
      email: req.body.email,
      website: req.body.website,
      otherProducts: req.body.otherProducts,
      monthlyVolume: req.body.monthlyVolume,
      coverageRegions: req.body.coverageRegions,
      outlets: req.body.outlets,
      vehicles: req.body.vehicles,
      warehouseCapacity: req.body.warehouseCapacity,
      distributesOtherBrands: req.body.distributesOtherBrands,
      otherBrands: req.body.otherBrands,
    };

    // Parse arrays
    if (req.body.businessCategory) {
      updatedData.businessCategory = JSON.parse(req.body.businessCategory);
    }
    if (req.body.productsInterested) {
      updatedData.productsInterested = JSON.parse(req.body.productsInterested);
    }
    if (req.body.coverageAreas) {
      updatedData.coverageAreas = JSON.parse(req.body.coverageAreas);
    }
    if (req.body.bankDetails) {
      updatedData.bankDetails = JSON.parse(req.body.bankDetails);
    }

    // Handle file uploads
    if (req.files && req.files.documents) {
      const uploadedFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];

      const documentFields = req.body.documentFields 
        ? JSON.parse(req.body.documentFields) 
        : [];

      updatedData.documents = { ...customer.documents.toObject() };

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const fieldName = documentFields[i];
        
        if (file && fieldName) {
          try {
            const result = await upload(file.tempFilePath, 'customers/documents');
            
            if (fieldName === 'businessPhotos') {
              if (!updatedData.documents.businessPhotos) {
                updatedData.documents.businessPhotos = [];
              }
              updatedData.documents.businessPhotos.push(result.secure_url);
            } else {
              updatedData.documents[fieldName] = result.secure_url;
            }
            
            console.log(`✅ Updated ${fieldName}`);
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${fieldName}:`, uploadError.message);
          }
        }
      }
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    console.log('✅ Customer updated successfully');
    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer,
    });
  } catch (error) {
    console.error('❌ Update customer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await Customer.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      message: 'Customer deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete customer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign sales rep to customer
export const assignSalesRep = async (req, res) => {
  try {
    const { customerId, salesRepId } = req.body;
    
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      { assignedSalesRep: salesRepId },
      { new: true }
    ).populate('assignedSalesRep', 'name email');
    
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    res.json({
      success: true,
      message: 'Sales rep assigned successfully',
      data: customer
    });
  } catch (error) {
    console.error('❌ Assign sales rep error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};