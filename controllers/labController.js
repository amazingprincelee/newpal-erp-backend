import IncomingShipment from "../models/incomingShipment.js";
import { upload } from "../config/cloudinary.js";

// Get all samples pending lab analysis
export const getSamplesPendingAnalysis = async (req, res) => {
  try {
    const samples = await IncomingShipment.find({
      currentStatus: 'IN_LAB',
      'labAnalysis.status': { $exists: false }
    })
    .populate('gateEntry.vendor', 'name')
    .populate('gateEntry.enteredBy', 'name')
    .populate('qualityControl.inspectedBy', 'name')
    .sort({ 'qualityControl.inspectedAt': 1 });

    res.status(200).json({
      success: true,
      count: samples.length,
      data: samples
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending samples",
      error: error.message
    });
  }
};

// Get specific sample for analysis
export const getSampleForAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sample = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('gateEntry.enteredBy', 'name')
      .populate('qualityControl.inspectedBy', 'name');

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }

    // Verify sample is in lab
    if (sample.currentStatus !== 'IN_LAB') {
      return res.status(400).json({
        success: false,
        message: "Sample is not in lab for analysis"
      });
    }

    res.status(200).json({
      success: true,
      data: sample
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sample",
      error: error.message
    });
  }
};

// Get current active analysis
export const getActiveAnalysis = async (req, res) => {
  try {
    // For now, we'll just return null or you can implement session-based active analysis
    res.status(200).json({
      success: true,
      data: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active analysis",
      error: error.message
    });
  }
};

// Upload lab report file
export const uploadLabReport = async (req, res) => {
  try {
    if (!req.files || !req.files.report) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const file = req.files.report;
    
    // Validate file type (only PDFs)
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed"
      });
    }

    // Upload to Cloudinary
    const result = await upload(file.tempFilePath, "lab-reports");

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message
    });
  }
};

// Submit microbiological analysis
export const submitMicrobiologicalAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      totalBacterialCount,
      yeastMoldCount,
      eColi,
      salmonella,
      coliformCount,
      testMethod,
      notes,
      reportUrl,
      overallResult
    } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }

    if (shipment.currentStatus !== 'IN_LAB') {
      return res.status(400).json({
        success: false,
        message: "Sample is not in lab for analysis"
      });
    }

    // Update lab analysis data
    shipment.labAnalysis = {
      ...shipment.labAnalysis,
      analyzedBy: req.user.id,
      analyzedAt: new Date(),
      eColi: eColi || 'Not Detected',
      salmonella: salmonella || 'Not Detected',
      notes: notes || '',
      reportUrl: reportUrl || '',
      status: overallResult === 'Pass - Meets Standards' ? 'PASSED' : 'FAILED',
      // Store microbiological data in notes or you can extend the schema
      microbiologicalData: {
        totalBacterialCount: parseFloat(totalBacterialCount) || 0,
        yeastMoldCount: parseFloat(yeastMoldCount) || 0,
        coliformCount: parseFloat(coliformCount) || 0,
        testMethod: testMethod || ''
      }
    };

    // Update status based on result
    if (overallResult === 'Pass - Meets Standards') {
      shipment.currentStatus = 'AT_WEIGHBRIDGE';
    } else {
      shipment.currentStatus = 'REJECTED';
    }

    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('labAnalysis.analyzedBy', 'name');

    res.status(200).json({
      success: true,
      message: overallResult === 'Pass - Meets Standards' 
        ? "Lab analysis completed. Sample passed and sent to weighbridge."
        : "Lab analysis completed. Sample failed quality standards.",
      data: updatedShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting lab analysis",
      error: error.message
    });
  }
};

// Submit chemical analysis
export const submitChemicalAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      aflatoxin,
      lead,
      cadmium,
      mercury,
      pesticides,
      notes,
      reportUrl,
      overallResult
    } = req.body;

    const shipment = await IncomingShipment.findById(id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }

    if (shipment.currentStatus !== 'IN_LAB') {
      return res.status(400).json({
        success: false,
        message: "Sample is not in lab for analysis"
      });
    }

    // Update lab analysis data
    shipment.labAnalysis = {
      ...shipment.labAnalysis,
      analyzedBy: req.user.id,
      analyzedAt: new Date(),
      aflatoxin: parseFloat(aflatoxin) || 0,
      heavyMetals: {
        lead: parseFloat(lead) || 0,
        cadmium: parseFloat(cadmium) || 0,
        mercury: parseFloat(mercury) || 0
      },
      notes: notes || '',
      reportUrl: reportUrl || '',
      status: overallResult === 'Pass - Meets Standards' ? 'PASSED' : 'FAILED',
      // Store additional chemical data
      chemicalData: {
        pesticides: parseFloat(pesticides) || 0
      }
    };

    // Update status based on result
    if (overallResult === 'Pass - Meets Standards') {
      shipment.currentStatus = 'AT_WEIGHBRIDGE';
    } else {
      shipment.currentStatus = 'REJECTED';
    }

    await shipment.save();

    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'name')
      .populate('labAnalysis.analyzedBy', 'name');

    res.status(200).json({
      success: true,
      message: overallResult === 'Pass - Meets Standards' 
        ? "Lab analysis completed. Sample passed and sent to weighbridge."
        : "Lab analysis completed. Sample failed quality standards.",
      data: updatedShipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting chemical analysis",
      error: error.message
    });
  }
};

// Get recent lab reports
export const getRecentLabReports = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const reports = await IncomingShipment.find({
      'labAnalysis.status': { $exists: true }
    })
    .populate('gateEntry.vendor', 'name')
    .populate('labAnalysis.analyzedBy', 'name')
    .sort({ 'labAnalysis.analyzedAt': -1 })
    .limit(limit);

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching lab reports",
      error: error.message
    });
  }
};

// Get lab statistics
export const getLabStatistics = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's lab analyses
    const todayAnalyses = await IncomingShipment.find({
      'labAnalysis.analyzedAt': {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    const totalAnalyzed = todayAnalyses.length;
    const passed = todayAnalyses.filter(s => s.labAnalysis?.status === 'PASSED').length;
    const failed = todayAnalyses.filter(s => s.labAnalysis?.status === 'FAILED').length;
    
    // Count pending samples
    const pending = await IncomingShipment.countDocuments({
      currentStatus: 'IN_LAB',
      'labAnalysis.status': { $exists: false }
    });

    res.status(200).json({
      success: true,
      data: {
        totalAnalyzed,
        passed,
        failed,
        pending,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching lab statistics",
      error: error.message
    });
  }
};