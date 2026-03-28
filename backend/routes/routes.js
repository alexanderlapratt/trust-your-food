import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Order from '../models/Order.js';

const __routeDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__routeDir, '../../.env'), override: true });

const router = express.Router();

const DIRECT_FEE = 8.99;
const GROUP_FEE = 2.99;

function shapeOrder(order) {
  return {
    id: 'ORD-' + order._id.toString().slice(-4).toUpperCase(),
    customer: order.customerName,
    address: order.deliveryAddress || 'Address on file',
    items: order.items.map((i) => `${i.productName} ×${i.quantity}`),
    farms: [...new Set(order.items.map((i) => i.farmName))],
    total: order.totalPrice,
    deliveryFee: order.deliveryFee ?? GROUP_FEE,
    deliveryType: order.deliveryType || 'group',
    status: order.status || 'confirmed',
  };
}

// GET /api/routes — return scheduled (group) windows + on-demand (direct) orders
// Returns { hasRealOrders, scheduledWindows, onDemandOrders }
router.get('/', async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const orders = await Order.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 });

    if (orders.length === 0) {
      return res.json({ hasRealOrders: false, scheduledWindows: [], onDemandOrders: [] });
    }

    // Split by delivery type
    const groupOrders = orders.filter((o) => (o.deliveryType || 'group') === 'group');
    const directOrders = orders.filter((o) => o.deliveryType === 'direct');

    // Batch group orders by window
    const windowMap = {};
    for (const order of groupOrders) {
      const key = order.deliveryWindow?.label || 'Unscheduled';
      if (!windowMap[key]) windowMap[key] = { window: key, date: order.deliveryWindow?.date, orders: [] };
      windowMap[key].orders.push(shapeOrder(order));
    }

    // Compute savings per window: (DIRECT_FEE - GROUP_FEE) × numOrders
    const scheduledWindows = Object.values(windowMap).map((w) => ({
      ...w,
      savings: Math.round((DIRECT_FEE - GROUP_FEE) * w.orders.length * 100) / 100,
    }));

    res.json({
      hasRealOrders: true,
      scheduledWindows,
      onDemandOrders: directOrders.map(shapeOrder),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/routes/dispatch — mock DoorDash Drive / Uber Direct dispatch
router.post('/dispatch', async (req, res) => {
  try {
    const { provider, windowLabel, orders } = req.body;
    if (!provider || !orders?.length) {
      return res.status(400).json({ error: 'Missing provider or orders' });
    }

    // Build canonical delivery request per DoorDash Drive / Uber Direct spec
    const totalValue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const deliveryRequest = {
      external_delivery_id: `TYF-${Date.now()}`,
      pickup_address: '212 Whalley Ave, New Haven, CT 06511',
      pickup_business_name: 'Trust Your Food',
      dropoff_address: orders[0]?.address || 'New Haven, CT',
      dropoff_contact_name: orders[0]?.customer || 'Customer',
      order_value: Math.round(totalValue * 100), // cents
    };

    // Simulate 2s API round-trip
    await new Promise((r) => setTimeout(r, 2000));

    const mockId = Math.random().toString(36).slice(2, 9).toUpperCase();
    const now = new Date();
    const pickupTime = new Date(now.getTime() + 60 * 60 * 1000);
    const deliveryTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (provider === 'doordash') {
      res.json({
        delivery_id: `DD-${mockId}`,
        status: 'created',
        provider: 'doordash',
        estimated_pickup_time: pickupTime.toISOString(),
        estimated_delivery_time: deliveryTime.toISOString(),
        tracking_url: `https://doordash.com/track/${mockId.toLowerCase()}`,
        request: deliveryRequest,
      });
    } else {
      res.json({
        delivery_id: `UB-${mockId}`,
        status: 'created',
        provider: 'uber',
        estimated_pickup_time: pickupTime.toISOString(),
        estimated_delivery_time: deliveryTime.toISOString(),
        tracking_url: `https://uber.com/track/${mockId.toLowerCase()}`,
        request: deliveryRequest,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
