import express from 'express';
import Product from '../models/Product.js';
import Farmer from '../models/Farmer.js';
import { computeTrustScore } from '../models/Farmer.js';

const router = express.Router();

// GET /api/products/price-suggestion?category=meat&name=chicken
router.get('/price-suggestion', async (req, res) => {
  try {
    const { category, name } = req.query;
    if (!category) return res.json({ sample_size: 0 });

    // Try name-fuzzy match within category first
    const filter = { category };
    if (name && name.trim().length > 2) {
      const words = name.trim().split(/\s+/).filter((w) => w.length >= 3);
      if (words.length > 0) {
        filter.$or = words.map((w) => ({ name: { $regex: w, $options: 'i' } }));
      }
    }

    let products = await Product.find(filter).select('price name');

    // Fall back to category-only if name match found nothing
    const scope = products.length > 0 ? 'name' : 'category';
    if (products.length === 0) {
      products = await Product.find({ category }).select('price');
    }

    if (products.length === 0) return res.json({ sample_size: 0 });

    const prices = products.map((p) => p.price).sort((a, b) => a - b);
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    res.json({
      average: +avg.toFixed(2),
      suggested_min: +prices[0].toFixed(2),
      suggested_max: +prices[prices.length - 1].toFixed(2),
      sample_size: prices.length,
      scope,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products — list all products with filters
router.get('/', async (req, res) => {
  try {
    const { category, search, noAntibiotics, noPesticides, pastureRaised, organicFeed, nonGMO, minPrice, maxPrice } =
      req.query;

    const filter = { inStock: true };

    if (category && category !== 'all') filter.category = category;
    if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };
    if (noAntibiotics === 'true') filter['practices.noAntibiotics'] = true;
    if (noPesticides === 'true') filter['practices.noPesticides'] = true;
    if (pastureRaised === 'true') filter['practices.pastureRaised'] = true;
    if (organicFeed === 'true') filter['practices.organicFeed'] = true;
    if (nonGMO === 'true') filter['practices.nonGMO'] = true;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { farmName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    // Enrich with trust score
    const farmerIds = [...new Set(products.map((p) => p.farmerId.toString()))];
    const farmers = await Farmer.find({ _id: { $in: farmerIds } });
    const farmerMap = Object.fromEntries(farmers.map((f) => [f._id.toString(), f]));

    const enriched = products.map((p) => {
      const farmer = farmerMap[p.farmerId.toString()];
      return {
        ...p.toJSON(),
        trustScore: farmer ? computeTrustScore(farmer) : 70,
        farmerLocation: farmer?.location,
        farmerBio: farmer?.bio || '',
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
