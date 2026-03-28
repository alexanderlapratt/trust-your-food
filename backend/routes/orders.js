import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Farmer from '../models/Farmer.js';

const router = express.Router();

function getNextDeliveryWindow() {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Deliveries happen Thursday and Saturday 5–7pm
  const deliveryDays = [4, 6]; // Thu=4, Sat=6

  let target = new Date(now);
  target.setHours(17, 0, 0, 0);

  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    candidate.setHours(17, 0, 0, 0);
    if (deliveryDays.includes(candidate.getDay())) {
      target = candidate;
      break;
    }
  }

  return {
    day: days[target.getDay()],
    date: target,
    startTime: '5:00 PM',
    endTime: '7:00 PM',
    label: `${days[target.getDay()]} ${target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · 5–7 PM`,
  };
}

const DIRECT_FEE = 8.99;
const GROUP_FEE = 2.99;

function getDirectDeliveryWindow() {
  const now = new Date();
  const delivery = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
  const h = delivery.getHours();
  const m = delivery.getMinutes() < 30 ? '00' : '30';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return {
    day: 'Today',
    date: delivery,
    startTime: `${h12}:${m} ${ampm}`,
    endTime: '',
    label: `Today by ${h12}:${m} ${ampm}`,
  };
}

// POST /api/orders — create order, return batched delivery window
router.post('/', async (req, res) => {
  try {
    const { customerName, customerEmail, deliveryAddress, items, deliveryType } = req.body;

    if (!items?.length) return res.status(400).json({ error: 'No items in order' });

    // Resolve products and compute totals
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

    let totalPrice = 0;
    const resolvedItems = items.map((item) => {
      const product = productMap[item.productId];
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const lineTotal = product.price * item.quantity;
      totalPrice += lineTotal;
      return {
        productId: product._id,
        farmerId: product.farmerId,
        farmName: product.farmName,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
      };
    });

    // Build route summary — group by farm
    const farmerIds = [...new Set(resolvedItems.map((i) => i.farmerId.toString()))];
    const farmers = await Farmer.find({ _id: { $in: farmerIds } });
    const routeSummary = farmers.map((f, idx) => ({
      farmName: f.farmName,
      address: `${f.location?.address || ''}, ${f.location?.city || 'New Haven'}, CT`,
      order: idx + 1,
    }));

    const type = deliveryType === 'direct' ? 'direct' : 'group';
    const fee = type === 'direct' ? DIRECT_FEE : GROUP_FEE;
    const deliveryWindow = type === 'direct' ? getDirectDeliveryWindow() : getNextDeliveryWindow();

    const order = new Order({
      customerName,
      customerEmail,
      deliveryAddress,
      items: resolvedItems,
      totalPrice: Math.round((totalPrice + fee) * 100) / 100,
      deliveryFee: fee,
      deliveryType: type,
      deliveryWindow,
      routeSummary,
    });

    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
