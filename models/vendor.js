// models/Vendor.js
import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  // SECTION A: Company Information
  companyName: { type: String, required: true, trim: true },
  tradingName: { type: String, trim: true },
  typeOfBusiness: {
    type: String,
    enum: ['Manufacturer', 'Distributor', 'Agent', 'Service Provider', 'Other'],
    required: true
  },
  yearEstablished: { type: Number, min: 1800, max: new Date().getFullYear() },
  rcNumber: { type: String, uppercase: true, trim: true }, // CAC Registration
  tin: { type: String, required: true, uppercase: true, trim: true }, // Tax ID
  registeredAddress: { type: String, required: true },
  factoryAddress: { type: String },

  // SECTION B: Contact Details
  contactPerson: { type: String, required: true },
  position: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, lowercase: true, required: true },
  website: { type: String, lowercase: true },

  // SECTION C: Supply Categories (Multi-select arrays)
  supplyCategories: {
    rawMaterials: [{ type: String, enum: ['Maize', 'Soya', 'Wheat', 'Additives', 'Premix'] }],
    packaging: [{ type: String, enum: ['Kraft Bags', 'Laminates', 'Cartons', 'Cans', 'Labels'] }],
    engineering: [{ type: String, enum: ['Electrical', 'Mechanical', 'Motors', 'Bearings', 'Fabrication'] }],
    services: [{
      type: String,
      enum: ['Transport/Logistics', 'Consultancy', 'Construction', 'Equipment Installation', 'Maintenance', 'Sanitation Services']
    }]
  },

  // SECTION D: Document Uploads (store file paths or Cloudinary/Multer URLs)
  documents: {
    certificateOfIncorporation: { type: String },   // file URL
    cacForms: { type: String },                     // CAC 2 & 7
    companyProfile: { type: String },
    taxClearance: { type: String },
    vatCertificate: { type: String },
    licenses: { type: String },                     // SON, NAFDAC, ISO etc.
    referenceLetters: { type: String },
    bankReference: { type: String }
  },

  // SECTION E: Bank Details
  bankDetails: {
    bankName: { type: String, required: true },
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    sortCode: { type: String },
    bankAddress: { type: String }
  },

  // SECTION F: Quality, Health & Safety
  qualitySafety: {
    hasQMS: { type: String, enum: ['Yes', 'No'], required: true },
    qmsSpecify: { type: String }, // only if Yes
    hasHSE: { type: String, enum: ['Yes', 'No'], required: true },
    isCompliant: { type: String, enum: ['Yes', 'No'], required: true },
    complianceCert: { type: String } // only if Yes
  },

  // Status & Admin
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  submittedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});


const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;