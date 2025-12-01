// utils/numberGenerators.js
import IncomingShipment from '../models/incomingShipment.js';
import OutgoingShipment from '../models/outgoingingShipment.js';
import SalesOrder from '../models/salesOrder.js';
import ProductionBatch from '../models/production.js';

// INCOMING SHIPMENT: IS-2025-000001
let incomingCounter = 0;
let lastIncomingDate = null;

export const generateIncomingNumber = async () => {
  const today = new Date().toISOString().slice(0, 10);
  if (lastIncomingDate !== today) {
    lastIncomingDate = today;
    const last = await IncomingShipment.findOne({ createdAt: { $gte: new Date(today) } })
      .sort({ createdAt: -1 });
    incomingCounter = last ? parseInt(last.shipmentNumber.split('-').pop()) + 1 : 1;
  } else {
    incomingCounter++;
  }
  return `IS-${new Date().getFullYear()}-${String(incomingCounter).padStart(6, '0')}`;
};

// OUTGOING SHIPMENT: OS-2025-000001
let outgoingCounter = 0;
let lastOutgoingDate = null;

export const generateOutgoingNumber = async () => {
  const today = new Date().toISOString().slice(0, 10);
  if (lastOutgoingDate !== today) {
    lastOutgoingDate = today;
    const last = await OutgoingShipment.findOne({ createdAt: { $gte: new Date(today) } })
      .sort({ createdAt: -1 });
    outgoingCounter = last ? parseInt(last.shipmentNumber.split('-').pop()) + 1 : 1;
  } else {
    outgoingCounter++;
  }
  return `OS-${new Date().getFullYear()}-${String(outgoingCounter).padStart(6, '0')}`;
};

// SALES ORDER: SO-2025-000001
let soCounter = 0;
let lastSOYear = null;

export const generateSONumber = async () => {
  const year = new Date().getFullYear();
  if (lastSOYear !== year) {
    lastSOYear = year;
    soCounter = 1;
  } else {
    const last = await SalesOrder.findOne().sort({ createdAt: -1 });
    soCounter = last ? parseInt(last.orderNumber.split('-').pop()) + 1 : 1;
  }
  return `SO-${year}-${String(soCounter).padStart(6, '0')}`;
};

// PRODUCTION BATCH: MF-20251124-0001 (Product Code + Date + Counter)
const productCodes = {
  'Maize Flour 50kg': 'MF',
  'Maize Grits': 'MG',
  'Corn-Soya Blend (CSB+)': 'CSB',
  'Instant Ogi': 'OG',
  'Maize-Based Malt Beverage': 'MB',
  'Animal Feed': 'AF'
};

let batchCounters = {};

export const generateBatchNumber = async (product) => {
  const code = productCodes[product] || 'XX';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  const key = `${code}-${dateStr}`;
  if (!batchCounters[key]) {
    const last = await ProductionBatch.findOne({ batchNumber: new RegExp(`^${code}-${dateStr}`) })
      .sort({ batchNumber: -1 });
    batchCounters[key] = last ? parseInt(last.batchNumber.split('-').pop()) + 1 : 1;
  } else {
    batchCounters[key]++;
  }

  return `${code}-${dateStr}-${String(batchCounters[key]).padStart(4, '0')}`;
};

// VISITOR PASS: PASS-20251124-1234
export const generatePassId = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PASS-${dateStr}-${random}`;
};