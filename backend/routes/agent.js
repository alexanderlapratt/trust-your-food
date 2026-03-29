// Farm-to-table AI agent route — includes /chat, /interpret, /speak
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import Product from '../models/Product.js';
import Farmer, { computeTrustScore } from '../models/Farmer.js';
import { callLava } from '../services/lava.js';

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

    const systemPrompt = `You are a farm-to-table shopping assistant. You have access to a list of available local farm products. When a user asks for a recipe or shopping help, suggest a recipe if relevant, map each ingredient to the best available farm product, and return a structured JSON response with: { message: string, recipe: string or null, suggested_items: [{ productId, productName, farmName, quantity, reason }] }. Prioritize farms with higher trust scores. Be warm and specific. IMPORTANT: Return ONLY valid JSON with no extra text or markdown.`;
    const userContent = `Available products:\n${JSON.stringify(productList, null, 2)}\n\nUser request: ${message}`;

    let raw;
    try {
      raw = await callLava(systemPrompt, userContent);
    } catch (lavaErr) {
      console.warn('[agent] Lava failed, falling back to Anthropic:', lavaErr.message);
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });
      raw = response.content[0].text;
    }

    raw = raw.trim();
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

// POST /api/agent/interpret — LLM cleans raw speech for a given step
router.post('/interpret', async (req, res) => {
  try {
    const { question, step, rawText } = req.body;
    if (!rawText) return res.status(400).json({ error: 'rawText is required' });

    const isProductStep = step === 'Product';

    const systemPrompt = isProductStep
      ? `You are a product-name normalizer for a farm marketplace. The farmer just said the name of their product out loud. Your job is to:
1. Return a clean, properly capitalized product name — remove filler words like "my", "our", "farm", "fresh", "local", "some", "a few", "some of my".
2. Normalize informal names to standard market names: "ground hamburger" → "Ground Beef", "hamburger meat" → "Ground Beef", "beef patties" → "Ground Beef", "farm eggs" → "Eggs", "hen eggs" → "Eggs", "chicken eggs" → "Eggs", "goat milk" → "Goat Milk", "cow milk" → "Whole Milk".
3. Also return the best-matching category from this exact list (pick the closest one):
   - "meat" — beef, hamburger, ground beef, steak, pork, chops, chicken, lamb, turkey, bacon, sausage, brisket, ribs, roast
   - "dairy" — milk, cheese, yogurt, butter, cream, kefir, whey, chevre, goat cheese
   - "eggs" — eggs, egg
   - "vegetables" — tomato, cucumber, squash, zucchini, pepper, carrot, lettuce, spinach, kale, broccoli, cabbage, onion, potato, sweet potato, beet, turnip, radish, pea, bean, corn
   - "fruits" — apple, pear, berry, strawberry, blueberry, raspberry, peach, plum, cherry, melon, watermelon, grape, citrus, orange, lemon
   - "herbs" — basil, rosemary, thyme, oregano, sage, dill, parsley, cilantro, mint, chive, lavender, herb bundle
   - "honey" — honey, honeycomb, beeswax
   - "grains" — bread, sourdough, rolls, loaf, flour, oats, grain, wheat, rice, granola
   - "other" — pie, cake, cookie, pastry, tart, brownie, jam, jelly, syrup, pickle, sauce, oil, vinegar

Return a JSON object with exactly two fields: { "name": "<clean product name>", "category": "<category slug>" }. No other text.`
      : `You are a speech-cleaning assistant for a farm marketplace voice onboarding flow. The farmer just answered a question out loud. Extract only the clean, direct answer from their speech — remove filler words, false starts, self-corrections, and hedging phrases. Return ONLY the cleaned answer text with no commentary, no quotation marks, no prefix.`;

    const userContent = isProductStep
      ? `Raw speech: "${rawText}"\n\nReturn JSON only.`
      : `Question asked: "${question || ''}"
Step context: ${step || ''}
Raw speech transcript: "${rawText}"

Return the cleaned answer only.`;

    let cleaned;
    try {
      cleaned = await callLava(systemPrompt, userContent);
    } catch (lavaErr) {
      console.warn('[agent/interpret] Lava failed, falling back to Anthropic:', lavaErr.message);
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });
      cleaned = response.content[0].text;
    }

    res.json({ cleaned: cleaned.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agent/speak — ElevenLabs TTS proxy (streams audio/mpeg back)
router.post('/speak', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey === 'your_elevenlabs_key_here') {
      return res.status(503).json({ error: 'ElevenLabs API key not configured' });
    }

    const response = await axios.post(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      }
    );

    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-cache');
    res.send(Buffer.from(response.data));
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message });
  }
});

export default router;
