import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import farmersRouter from './routes/farmers.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import trustRouter from './routes/trust.js';
import agentRouter from './routes/agent.js';
import routesRouter from './routes/routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env'), override: true });
console.log('[server.js] ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ MISSING');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/farmers', farmersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/trust', trustRouter);
app.use('/api/agent', agentRouter); // AI chat
app.use('/api/routes', routesRouter); // Logistics + dispatch v3

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trust-your-food')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Starting server without database (demo mode)...');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT} (no DB)`));
  });
