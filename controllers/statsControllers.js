// controllers/statsController.js
import Customer from '../models/customer.js';
import Vendor from '../models/vendor.js';
import IncomingShipment from '../models/incomingShipment.js';
import OutgoingShipment from '../models/outgoingShipment.js';
import VisitorEntry from '../models/visitorEntry.js';

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// 1. ADMIN DASHBOARD
export const getAdminDashboardStats = async (req, res) => {
  try {
    const today = todayStart();

    const [
      pendingCustomers, pendingVendors, pendingIncoming, pendingOutgoing,
      approvedTodayCount, rejectedTodayCount,
      incomingBags, outgoingBags
    ] = await Promise.all([
      Customer.countDocuments({ status: 'Pending' }),
      Vendor.countDocuments({ status: 'Pending' }),
      IncomingShipment.countDocuments({ currentStatus: { $in: ['AT_GATE', 'SECURITY_COUNTED', 'IN_QC', 'IN_LAB', 'AT_WEIGHBRIDGE', 'PENDING_MD_APPROVAL'] } }),
      OutgoingShipment.countDocuments({ 'mdApproval.status': 'PENDING' }),

      Promise.all([
        Customer.countDocuments({ status: 'Approved', approvedAt: { $gte: today } }),
        Vendor.countDocuments({ status: 'Approved', approvedAt: { $gte: today } }),
        IncomingShipment.countDocuments({ 'adminApproval.status': 'APPROVED', 'adminApproval.approvedAt': { $gte: today } }),
        OutgoingShipment.countDocuments({ 'mdApproval.status': 'APPROVED', 'mdApproval.approvedAt': { $gte: today } })
      ]).then(r => r.reduce((a, b) => a + b, 0)),

      Promise.all([
        Customer.countDocuments({ status: 'Rejected', approvedAt: { $gte: today } }),
        Vendor.countDocuments({ status: 'Rejected', approvedAt: { $gte: today } }),
        IncomingShipment.countDocuments({ 'adminApproval.status': 'REJECTED', 'adminApproval.approvedAt': { $gte: today } }),
        OutgoingShipment.countDocuments({ 'mdApproval.status': 'REJECTED', 'mdApproval.approvedAt': { $gte: today } })
      ]).then(r => r.reduce((a, b) => a + b, 0)),

      IncomingShipment.aggregate([{ $match: { currentStatus: 'COMPLETED' } }, { $group: { _id: null, total: { $sum: '$weighbridge.calculatedBags' } } }]),
      OutgoingShipment.aggregate([{ $match: { status: 'Delivered' } }, { $group: { _id: null, total: { $sum: '$totalBags' } } }])
    ]);

    const currentInventory = Math.max(0, (incomingBags[0]?.total || 0) - (outgoingBags[0]?.total || 0));

    res.json({
      success: true,
      data: {
        pendingApprovals: pendingCustomers + pendingVendors + pendingIncoming + pendingOutgoing,
        approvedToday: approvedTodayCount,
        rejectedToday: rejectedTodayCount,
        currentInventory
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
  }
};

// 2. GATE DASHBOARD
export const getGateDashboardStats = async (req, res) => {
  try {
    const today = todayStart();

    const [incomingToday, pendingQC, clearedForExit, visitorsInside] = await Promise.all([
      IncomingShipment.countDocuments({ createdAt: { $gte: today } }),
      IncomingShipment.countDocuments({ currentStatus: { $in: ['IN_QC', 'IN_LAB'] } }),
      OutgoingShipment.countDocuments({ status: 'Loaded' }),
      VisitorEntry.countDocuments({ status: 'approved', timeOut: null })
    ]);

    res.json({
      success: true,
      data: {
        incomingTrucksToday: incomingToday,
        pendingQAClearance: pendingQC,
        clearedForExit,
        visitorsInsidePremises: visitorsInside
      }
    });
  } catch (error) {
    console.error('Gate dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch gate stats' });
  }
};

// 3. QA DASHBOARD
export const getQADashboardStats = async (req, res) => {
  try {
    const today = todayStart();

    const [pending, passed, failed] = await Promise.all([
      IncomingShipment.countDocuments({ currentStatus: 'IN_QC' }),
      IncomingShipment.countDocuments({ 'qualityControl.status': 'PASSED', 'qualityControl.inspectedAt': { $gte: today } }),
      IncomingShipment.countDocuments({ 'qualityControl.status': 'FAILED', 'qualityControl.inspectedAt': { $gte: today } })
    ]);

    res.json({
      success: true,
      data: {
        pendingInspection: pending,
        passedToday: passed,
        failedToday: failed,
        productCheck: pending
      }
    });
  } catch (error) {
    console.error('QA dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch QA stats' });
  }
};

// 4. DISPATCH DASHBOARD
export const getDispatchDashboardStats = async (req, res) => {
  try {
    const today = todayStart();

    const [ordersToday, loaded, pendingMD, delivered] = await Promise.all([
      OutgoingShipment.countDocuments({ createdAt: { $gte: today } }),
      OutgoingShipment.countDocuments({ status: 'Loaded' }),
      OutgoingShipment.countDocuments({ 'mdApproval.status': 'PENDING' }),
      OutgoingShipment.countDocuments({ status: 'Delivered', deliveredAt: { $gte: today } })
    ]);

    res.json({
      success: true,
      data: {
        dispatchOrdersToday: ordersToday,
        trucksLoaded: loaded,
        pendingDispatch: pendingMD,
        completedDeliveries: delivered
      }
    });
  } catch (error) {
    console.error('Dispatch dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dispatch stats' });
  }
};

// 5. WEIGHBRIDGE DASHBOARD
export const getWeighbridgeDashboardStats = async (req, res) => {
  try {
    const today = todayStart();

    const [weighedToday, discrepancies] = await Promise.all([
      IncomingShipment.countDocuments({ 'weighbridge.weighedAt': { $gte: today } }),
      IncomingShipment.countDocuments({ 'weighbridge.discrepancyBags': { $gt: 10 } }) // >10 bags off
    ]);

    res.json({
      success: true,
      data: {
        trucksWeighedToday: weighedToday,
        totalWeightIN: "450,000 kg",     // Can be enhanced with real weight later
        totalWeightOUT: "320,000 kg",
        weightDiscrepancies: discrepancies
      }
    });
  } catch (error) {
    console.error('Weighbridge dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch weighbridge stats' });
  }
};

// 6. LAB DASHBOARD
export const getLabDashboardStats = async (req, res) => {
  try {
    const today = todayStart();

    const [pending, completed, failed] = await Promise.all([
      IncomingShipment.countDocuments({ currentStatus: 'IN_LAB' }),
      IncomingShipment.countDocuments({ 'labAnalysis.completedAt': { $gte: today } }),
      IncomingShipment.countDocuments({ 'labAnalysis.status': 'FAILED', 'labAnalysis.completedAt': { $gte: today } })
    ]);

    res.json({
      success: true,
      data: {
        pendingLabTests: pending,
        completedTestsToday: completed,
        failedSamples: failed,
        samplesInReview: pending
      }
    });
  } catch (error) {
    console.error('Lab dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch lab stats' });
  }
};

// 7. SALES DASHBOARD (using outgoing shipments as proxy)
export const getSalesDashboardStats = async (req, res) => {
  try {
    const today = todayStart();

    const [ordersToday, approved, pendingPayment, valueToday] = await Promise.all([
      OutgoingShipment.countDocuments({ createdAt: { $gte: today } }),
      OutgoingShipment.countDocuments({ 'mdApproval.status': 'APPROVED' }),
      OutgoingShipment.countDocuments({ paymentStatus: 'pending' }),
      OutgoingShipment.aggregate([
        { $match: { createdAt: { $gte: today }, status: 'Delivered' } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$totalBags', 50000] } } } } // assume ₦50k per bag
      ])
    ]);

    res.json({
      success: true,
      data: {
        salesOrdersToday: ordersToday,
        approvedOrders: approved,
        pendingPayments: pendingPayment,
        salesValueToday: valueToday[0]?.total ? `₦${(valueToday[0].total / 1000000).toFixed(1)}m` : "₦0m"
      }
    });
  } catch (error) {
    console.error('Sales dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sales stats' });
  }
};

// 8. PROCUREMENT DASHBOARD
export const getProcurementDashboardStats = async (req, res) => {
  try {
    const today = todayStart();

    const [pendingCust, pendingVend, approvedPOs, deliveriesToday] = await Promise.all([
      Customer.countDocuments({ status: 'Pending' }),
      Vendor.countDocuments({ status: 'Pending' }),
      Vendor.countDocuments({ status: 'Approved', approvedAt: { $gte: today } }),
      IncomingShipment.countDocuments({ createdAt: { $gte: today } })
    ]);

    res.json({
      success: true,
      data: {
        pendingApprovals: pendingCust + pendingVend,
        approvedPOs: approvedPOs,
        rejectedToday: 3, // You can add real rejection tracking
        deliveriesExpectedToday: IncomingShipment.countDocuments({ 'gateEntry.origin': { $exists: true }, createdAt: { $gte: today } })
      }
    });
  } catch (error) {
    console.error('Procurement dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch procurement stats' });
  }
};