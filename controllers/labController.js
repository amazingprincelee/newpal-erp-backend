// controllers/labController.js - UPDATED TO MATCH NEW WORKFLOW
import IncomingShipment from "../models/incomingShipment.js";
import { upload } from "../config/cloudinary.js";

// Get all samples pending lab analysis
export const getSamplesPendingAnalysis = async (req, res) => {
  try {
    const samples = await IncomingShipment.find({
      currentStatus: 'IN_LAB'
    })
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('gateEntry.enteredBy', 'fullname username email')
    .populate('qualityControl.inspectedBy', 'fullname username email')
    .sort({ 'qualityControl.inspectedAt': 1 }); // Oldest first (FIFO)

    console.log(`✅ Found ${samples.length} samples pending lab analysis`);

    res.status(200).json({
      success: true,
      count: samples.length,
      data: samples
    });
  } catch (error) {
    console.error('❌ Error fetching pending samples:', error);
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
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('gateEntry.enteredBy', 'fullname username email')
      .populate('qualityControl.inspectedBy', 'fullname username email')
      .populate('mdApprovals.gateApproval.reviewedBy', 'fullname username email');

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
        message: `Sample is not in lab for analysis. Current status: ${sample.currentStatus}`
      });
    }

    console.log(`✅ Retrieved sample ${sample.shipmentNumber} for analysis`);

    res.status(200).json({
      success: true,
      data: sample
    });
  } catch (error) {
    console.error('❌ Error fetching sample:', error);
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

    console.log(`✅ Lab report uploaded: ${result.secure_url}`);

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    console.error('❌ Error uploading file:', error);
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
        message: `Sample is not in lab for analysis. Current status: ${shipment.currentStatus}`
      });
    }

    // Determine if sample passed or failed
    const isPassed = overallResult === 'Pass - Meets Standards';

    // Update lab analysis data
    shipment.labAnalysis = {
      sampleId: shipment.shipmentNumber,
      analyzedBy: req.user?.id || req.user?._id,
      analyzedAt: new Date(),
      eColi: eColi || 'Not Detected',
      salmonella: salmonella || 'Not Detected',
      notes: `MICROBIOLOGICAL ANALYSIS\n\n` +
             `Total Bacterial Count: ${totalBacterialCount || 'N/A'} CFU/g\n` +
             `Yeast & Mold Count: ${yeastMoldCount || 'N/A'} CFU/g\n` +
             `Coliform Count: ${coliformCount || 'N/A'} MPN/g\n` +
             `Test Method: ${testMethod || 'N/A'}\n\n` +
             `${notes || ''}`,
      reportUrl: reportUrl || '',
      status: isPassed ? 'PASSED' : 'FAILED'
    };

    // Update status based on result - STAGE 4 outcomes
    if (isPassed) {
      shipment.currentStatus = 'LAB_PASSED'; // Will proceed to weighbridge gross (Stage 5)
    } else {
      shipment.currentStatus = 'LAB_REJECTED'; // Process terminates
    }

    await shipment.save();

    // Populate for response
    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('labAnalysis.analyzedBy', 'fullname username email')
      .populate('qualityControl.inspectedBy', 'fullname username email');

    console.log(`✅ Microbiological analysis completed for ${shipment.shipmentNumber}: ${isPassed ? 'PASSED' : 'FAILED'}`);

    res.status(200).json({
      success: true,
      message: isPassed 
        ? "Lab analysis completed. Sample passed and ready for weighbridge (gross weight)."
        : "Lab analysis completed. Sample failed quality standards and has been rejected.",
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error submitting microbiological analysis:', error);
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
        message: `Sample is not in lab for analysis. Current status: ${shipment.currentStatus}`
      });
    }

    // Determine if sample passed or failed
    const isPassed = overallResult === 'Pass - Meets Standards';

    // Update lab analysis data
    shipment.labAnalysis = {
      sampleId: shipment.shipmentNumber,
      analyzedBy: req.user?.id || req.user?._id,
      analyzedAt: new Date(),
      aflatoxin: parseFloat(aflatoxin) || 0,
      heavyMetals: {
        lead: parseFloat(lead) || 0,
        cadmium: parseFloat(cadmium) || 0,
        mercury: parseFloat(mercury) || 0
      },
      notes: `CHEMICAL ANALYSIS\n\n` +
             `Aflatoxin: ${aflatoxin || 'N/A'} ppb\n` +
             `Lead: ${lead || 'N/A'} ppm\n` +
             `Cadmium: ${cadmium || 'N/A'} ppm\n` +
             `Mercury: ${mercury || 'N/A'} ppm\n` +
             `Pesticides: ${pesticides || 'N/A'} ppm\n\n` +
             `${notes || ''}`,
      reportUrl: reportUrl || '',
      status: isPassed ? 'PASSED' : 'FAILED'
    };

    // Update status based on result - STAGE 4 outcomes
    if (isPassed) {
      shipment.currentStatus = 'LAB_PASSED'; // Will proceed to weighbridge gross (Stage 5)
    } else {
      shipment.currentStatus = 'LAB_REJECTED'; // Process terminates
    }

    await shipment.save();

    // Populate for response
    const updatedShipment = await IncomingShipment.findById(id)
      .populate('gateEntry.vendor', 'companyName contactPerson phone')
      .populate('labAnalysis.analyzedBy', 'fullname username email')
      .populate('qualityControl.inspectedBy', 'fullname username email');

    console.log(`✅ Chemical analysis completed for ${shipment.shipmentNumber}: ${isPassed ? 'PASSED' : 'FAILED'}`);

    res.status(200).json({
      success: true,
      message: isPassed 
        ? "Lab analysis completed. Sample passed and ready for weighbridge (gross weight)."
        : "Lab analysis completed. Sample failed quality standards and has been rejected.",
      data: updatedShipment
    });
  } catch (error) {
    console.error('❌ Error submitting chemical analysis:', error);
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
    .populate('gateEntry.vendor', 'companyName contactPerson phone')
    .populate('labAnalysis.analyzedBy', 'fullname username email')
    .sort({ 'labAnalysis.analyzedAt': -1 })
    .limit(limit);

    console.log(`✅ Retrieved ${reports.length} recent lab reports`);

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('❌ Error fetching lab reports:', error);
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
      currentStatus: 'IN_LAB'
    });

    console.log(`✅ Lab statistics: Pending: ${pending}, Analyzed today: ${totalAnalyzed}, Passed: ${passed}, Failed: ${failed}`);

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
    console.error('❌ Error fetching lab statistics:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching lab statistics",
      error: error.message
    });
  }
};