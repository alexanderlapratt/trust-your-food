# 🌿 Trust Your Food

> Transparency-first local food infrastructure — voice listing, AI shopping agent, and optimized last-mile delivery.

**YHack 2026 — Yale University**

## The Problem

I was raised on a farm. My father was a farmer. The chicken at your grocery store was raised on feed sprayed with glyphosate, washed in chlorine, and labeled "natural" — a word with no legal definition on a food label. Local farmers have better food and no way to reach you. I built the infrastructure that connects you.

- 90% of Americans could be fed by food grown within 100 miles of their home
- Farmers receive only 15.9 cents of every food dollar spent
- 39 million Americans live in food deserts
- "Natural" has no legal definition on a food label

## Features

🎙️ **Voice Farmer Onboarding** — Farmers list products in under 2 minutes by voice. AI agent asks questions via ElevenLabs, interprets natural speech via Claude/Lava API, suggests pricing, reads listing back for confirmation.

🔍 **Trust Score Engine** — Every farm gets a 0-100 trust score based on profile completeness, farming practice transparency, fulfillment reliability, and community ratings.

🤖 **Farm-to-Table AI Shopping Agent** — Type what you want, get a recipe built from local inventory, basket filled in one click.

🚚 **Two-Tier Last-Mile Logistics** — Group Delivery ($2.99) batches orders across farms. Direct Delivery ($8.99) dispatches via DoorDash Drive. Farmers get instant email notifications.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **AI:** Claude via Lava API gateway
- **Voice:** ElevenLabs TTS + Web Speech API
- **Delivery:** DoorDash Drive API
- **Notifications:** Nodemailer
- **Domain:** trustyourfood.farm (GoDaddy Registry)

## Running Locally

```bash
npm install
npm run dev
```

Frontend: http://localhost:5174
Backend: http://localhost:3001

## Environment Variables

```
MONGODB_URI=your_mongodb_uri
ANTHROPIC_API_KEY=your_key
LAVA_API_KEY=your_key
ELEVENLABS_API_KEY=your_key
GMAIL_USER=your_gmail
GMAIL_APP_PASSWORD=your_app_password
DOORDASH_API_KEY=your_key
```

## Live

🌐 [trustyourfood.farm](https://trustyourfood.farm)
