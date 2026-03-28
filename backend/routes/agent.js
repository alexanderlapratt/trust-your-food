// Farm-to-table AI agent route
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import Product from '../models/Product.js';
import Farmer, { computeTrustScore } from '../models/Farmer.js';

const router = express.Router();

// POST /api/agent/chat
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    // Fetch all in-stock products and enrich with trust scores
    const products = await Product.find({ inStock: true }).lean();
    const farmerIds = [...new Set(products.map((p) => p.farmerId?.toString()).filter(Boolean))];
    const farmers = await Farmer.find({ _id: { $in: farmerIds } }).lean();
    const farmerMap = Object.fromEntries(farmers.map((f) => [f._id.toString(), f]));

    const productList = products.map((p) => {
      const farmer = farmerMap[p.farmerId?.toString()];
      return {
        productId: p._id,
        productName: p.name,
        farmName: p.farmName,
        category: p.category,
        price: p.price,
        unit: p.unit,
        quantity: p.quantity,
        trustScore: farmer ? computeTrustScore(farmer) : 70,
        practices: Object.entries(p.practices || {}).filter(([, v]) => v).map(([k]) => k),
        description: p.description || '',
      };
    });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a farm-to-table shopping assistant. You have access to a list of available local farm products. When a user asks for a recipe or shopping help, suggest a recipe if relevant, map each ingredient to the best available farm product, and return a structured JSON response with: { message: string, recipe: string or null, suggested_items: [{ productId, productName, farmName, quantity, reason }] }. Prioritize farms with higher trust scores. Be warm and specific. IMPORTANT: Return ONLY valid JSON with no extra text or markdown.`,
      messages: [{
        role: 'user',
        content: `Available products:\n${JSON.stringify(productList, null, 2)}\n\nUser request: ${message}`,
      }],
    });

    const raw = response.content[0].text.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      try {
        parsed = match ? JSON.parse(match[0]) : null;
      } catch {
        parsed = null;
      }
      if (!parsed) {
        parsed = { message: raw, recipe: null, suggested_items: [] };
      }
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
