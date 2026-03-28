import express from 'express';
import Product from '../models/Product.js';
import Farmer from '../models/Farmer.js';
import { computeTrustScore } from '../models/Farmer.js';

const router = express.Router();

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
