import Inventory from "../../models/inventory.js";


export const getDashboardStats = async () => {
  const [inventoryStats, assetCount, lowStock, ticketsPending] = await Promise.all([
    Inventory.aggregate([
      { $match: { category: { $in: ['RAW_MATERIAL', 'FINISHED_GOODS'] } } },
      { $group: { _id: null, totalBags: { $sum: "$quantity" } } }
    ]),
    Inventory.countDocuments(),
    Inventory.countDocuments({ belowReorderLevel: true }),
    ReceivingTicket.countDocuments({ status: 'Pending MD Approval' })
  ]);

  return {
    totalSKUs: await Inventory.distinct('productType').then(arr => arr.length),
    itemsInStock: inventoryStats[0]?.totalBags || 0,
    lowStockItems: lowStock,
    requisitionsToday: ticketsPending
  };
};
