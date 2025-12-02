import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  // SECTION A: Business Information
  companyName: { type: String, required: true, trim: true },
  tradingName: { type: String, trim: true },
  typeOfBusiness: {
    type: String,
    enum: ['Distributor', 'Wholesaler', 'Retailer', 'Exporter', 'Agent', 'Other'],
    required: true
  },
  yearEstablished: { type: Number, min: 1900, max: new Date().getFullYear() },
  rcNumber: { type: String, trim: true },        // CAC Registration
  tin: { type: String, required: true, trim: true },
  registeredAddress: { type: String, required: true },
  operationalAddress: { type: String, required: true }, // Warehouse/Shop

  // SECTION B: Contact Details
  contactPerson: { type: String, required: true },
  position: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, lowercase: true, required: true },
  website: { type: String, lowercase: true },

  // SECTION C: Distribution Capacity & Product Interest
  businessCategory: [{
    type: String,
    enum: [
      'Bulk Buyer',
      'Distributor',
      'Retail Chain Supplier',
      'Export Partner',
      'Institutional Buyer (NGOs, Schools, Government, etc.)'
    ]
  }],

  productsInterested: [{
    type: String,
    enum: [
      'Maize Flour',
      'Maize Grits',
      'Corn-Soya Blend (CSB+)',
      'Instant Ogi',
      'Maize-Based Malt Beverage',
      'Packaging Materials'
    ]
  }],
  otherProducts: { type: String }, // if they write extra

  monthlyVolume: {
    type: String,
    enum: ['1–5 MT', '6–20 MT', '21–50 MT', '50–100 MT', 'Above 100 MT'],
    required: true
  },

  coverageAreas: [{
    type: String,
    enum: ['Local Market', 'Statewide', 'Nationwide', 'Export']
  }],
  coverageRegions: { type: String }, // e.g. "Lagos, Ogun, Abuja"

  // SECTION D: Business Operations
  outlets: { type: String },           // Number of outlets
  vehicles: { type: String },          // Number of delivery vehicles
  warehouseCapacity: { type: String }, // e.g. "500 MT" or "2000 m²"

  distributesOtherBrands: { type: String, enum: ['Yes', 'No'], required: true },
  otherBrands: { type: String },       // only if Yes

  // SECTION E: Document Uploads
  documents: {
    cacCertificate: { type: String },     // URL
    tinDocument: { type: String },
    businessPhotos: [{ type: String }],   // multiple photos allowed
    bankReference: { type: String },
    purchaseRecords: { type: String },
    distributorLicense: { type: String }
  },

  // SECTION F: Bank Information
  bankDetails: {
    bankName: { type: String, required: true },
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    sortCode: { type: String },
    bankAddress: { type: String }
  },

  // Approval & Status
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Blacklisted'],
    default: 'Pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  submittedAt: { type: Date, default: Date.now },

  // Sales-specific fields (useful later)
  assignedSalesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creditLimit: { type: Number, default: 0 },
  paymentTerms: { type: String, enum: ['Cash', '7 Days', '14 Days', '30 Days'], default: 'Cash' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes for fast search & dashboard
customerSchema.index({ companyName: 'text', tradingName: 'text', tin: 'text' });
customerSchema.index({ status: 1 });
customerSchema.index({ monthlyVolume: 1 });
customerSchema.index({ 'businessCategory': 1 });
customerSchema.index({ 'productsInterested': 1 });
customerSchema.index({ assignedSalesRep: 1 });

export default mongoose.model('Customer', customerSchema);