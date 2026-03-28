import express from 'express';
import Farmer, { computeTrustScore } from '../models/Farmer.js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __routeDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__routeDir, '../../.env');
dotenv.config({ path: envPath, override: true });
console.log('[trust] ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ MISSING');

const router = express.Router();

// GET /api/trust/:farmerId — compute and return trust score breakdown
router.get('/:farmerId', async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.farmerId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    const practices = farmer.practices || {};
    const toggles = ['noAntibiotics', 'noPesticides', 'pastureRaised', 'organicFeed', 'nonGMO'];

    const profileFields = ['name', 'farmName', 'email', 'phone', 'bio', 'location.city', 'certifications', 'profileImage'];
    let filled = 0;
    if (farmer.name) filled++;
    if (farmer.farmName) filled++;
    if (farmer.email) filled++;
    if (farmer.phone) filled++;
    if (farmer.bio && farmer.bio.length > 20) filled++;
    if (farmer.location?.city) filled++;
    if (farmer.certifications?.length > 0) filled++;
    if (farmer.profileImage) filled++;

    const completenessRaw = filled / profileFields.length;
    const trueCount = toggles.filter((k) => practices[k]).length;
    const transparencyRaw = trueCount / toggles.length;

    const breakdown = {
      total: computeTrustScore(farmer),
      components: {
        profileCompleteness: {
          score: Math.round(completenessRaw * 20),
          max: 20,
          pct: Math.round(completenessRaw * 100),
          label: 'Profile Completeness',
        },
        transparency: {
          score: Math.round(transparencyRaw * 40),
          max: 40,
          pct: Math.round(transparencyRaw * 100),
          label: 'Transparency & Practices',
          practicesEnabled: toggles.filter((k) => practices[k]),
        },
        reliability: {
          score: Math.round((farmer.fulfillmentRate ?? 0.95) * 30),
          max: 30,
          pct: Math.round((farmer.fulfillmentRate ?? 0.95) * 100),
          label: 'Reliability',
          fulfillmentRate: farmer.fulfillmentRate ?? 0.95,
        },
        community: {
          score: Math.round(((farmer.averageRating ?? 4.5) / 5) * 10),
          max: 10,
          pct: Math.round(((farmer.averageRating ?? 4.5) / 5) * 100),
          label: 'Community Rating',
          averageRating: farmer.averageRating ?? 4.5,
          reviewCount: farmer.reviewCount ?? 0,
        },
      },
    };

    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trust/:farmerId/explain — call Anthropic to explain the trust score
router.post('/:farmerId/explain', async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.farmerId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    const practices = farmer.practices || {};
    const toggles = ['noAntibiotics', 'noPesticides', 'pastureRaised', 'organicFeed', 'nonGMO'];

    let filled = 0;
    if (farmer.name) filled++;
    if (farmer.farmName) filled++;
    if (farmer.email) filled++;
    if (farmer.phone) filled++;
    if (farmer.bio && farmer.bio.length > 20) filled++;
    if (farmer.location?.city) filled++;
    if (farmer.certifications?.length > 0) filled++;
    if (farmer.profileImage) filled++;

    const completenessRaw = filled / 8;
    const trueCount = toggles.filter((k) => practices[k]).length;
    const transparencyRaw = trueCount / toggles.length;
    const enabledPractices = toggles.filter((k) => practices[k]);

    const breakdown = {
      total: computeTrustScore(farmer),
      components: {
        profileCompleteness: { score: Math.round(completenessRaw * 20), max: 20, label: 'Profile Completeness' },
        transparency: {
          score: Math.round(transparencyRaw * 40), max: 40, label: 'Transparency & Practices',
          practicesEnabled: enabledPractices,
        },
        reliability: {
          score: Math.round((farmer.fulfillmentRate ?? 0.95) * 30), max: 30, label: 'Reliability',
          fulfillmentRate: farmer.fulfillmentRate ?? 0.95,
        },
        community: {
          score: Math.round(((farmer.averageRating ?? 4.5) / 5) * 10), max: 10, label: 'Community Rating',
          averageRating: farmer.averageRating ?? 4.5,
        },
      },
    };

    const scoreText = [
      `Farm: ${farmer.farmName}`,
      `Total Trust Score: ${breakdown.total}/100`,
      `- Profile Completeness: ${breakdown.components.profileCompleteness.score}/20`,
      `- Transparency & Practices: ${breakdown.components.transparency.score}/40 (practices: ${enabledPractices.join(', ') || 'none listed'})`,
      `- Reliability: ${breakdown.components.reliability.score}/30 (${Math.round((farmer.fulfillmentRate ?? 0.95) * 100)}% fulfillment rate)`,
      `- Community Rating: ${breakdown.components.community.score}/10 (${(farmer.averageRating ?? 4.5).toFixed(1)} stars)`,
    ].join('\n');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: "You are a friendly food transparency assistant. Given a farm's trust score breakdown, write 3 short sentences explaining what the score means for a consumer in plain English. Be warm and specific.",
      messages: [{ role: 'user', content: scoreText }],
    });

    res.json({ explanation: message.content[0].text, breakdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
