import express from 'express';
import Farmer from '../models/Farmer.js';
import Product from '../models/Product.js';

const router = express.Router();

// POST /api/farmers — create farmer + listing
router.post('/', async (req, res) => {
  try {
    const { farmer: farmerData, product: productData } = req.body;

    const farmer = new Farmer(farmerData);
    await farmer.save();

    let savedProduct = null;
    if (productData) {
      const product = new Product({
        ...productData,
        farmerId: farmer._id,
        farmerName: farmer.name,
        farmName: farmer.farmName,
        practices: farmer.practices,
      });
      savedProduct = await product.save();
    }

    res.status(201).json({ farmer, product: savedProduct });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/farmers — list all farmers
router.get('/', async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ createdAt: -1 });
    res.json(farmers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmers/:id
router.get('/:id', async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });
    const products = await Product.find({ farmerId: farmer._id, inStock: true });
    res.json({ farmer, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
