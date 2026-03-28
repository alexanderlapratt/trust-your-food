import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Farmer from './models/Farmer.js';
import Product from './models/Product.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trust-your-food';

const farmers = [
  {
    name: 'Margaret & Tom Holloway',
    farmName: 'Holloway Heritage Farm',
    email: 'margaret@hollowayfarm.com',
    phone: '203-555-0142',
    bio: 'Third-generation family farm nestled in the Sleeping Giant foothills. We raise heritage breeds and grow heirloom vegetables using methods passed down from our grandparents — no shortcuts, no compromises.',
    location: { address: '44 Orchard Hill Rd', city: 'Hamden', state: 'CT', zip: '06518', lat: 41.396, lng: -72.897 },
    practices: { noAntibiotics: true, noPesticides: true, pastureRaised: true, organicFeed: true, nonGMO: true },
    yearsInOperation: 42,
    certifications: ['USDA Organic', 'Animal Welfare Approved'],
    profileImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400',
    fulfillmentRate: 0.98,
    averageRating: 4.9,
    totalOrders: 312,
    reviewCount: 89,
  },
  {
    name: 'David & Sarah Chen',
    farmName: 'Stone Acre Farm',
    email: 'david@stoneacrefarm.com',
    phone: '203-555-0334',
    bio: 'Shoreline vegetable farm specializing in cucumbers and squash for the New Haven farmers market. We grow everything without synthetic pesticides and pick to order for peak freshness.',
    location: { address: '45 Pine Orchard Rd', city: 'Branford', state: 'CT', zip: '06405', lat: 41.277, lng: -72.817 },
    practices: { noAntibiotics: false, noPesticides: true, pastureRaised: false, organicFeed: false, nonGMO: true },
    yearsInOperation: 4,
    certifications: ['Certified Naturally Grown'],
    profileImage: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400',
    fulfillmentRate: 0.95,
    averageRating: 4.6,
    totalOrders: 98,
    reviewCount: 31,
  },
  {
    name: 'Priya & Dev Sharma',
    farmName: 'Riverstone Dairy',
    email: 'priya@riverstonedairy.com',
    phone: '203-555-0391',
    bio: 'Small-batch artisan dairy on the Quinnipiac River. Our 14 Jersey cows are pasture-raised year-round and never receive growth hormones. We make fresh cheeses, yogurt, and bottled whole milk.',
    location: { address: '901 River Rd', city: 'Cheshire', state: 'CT', zip: '06410', lat: 41.499, lng: -72.904 },
    practices: { noAntibiotics: true, noPesticides: true, pastureRaised: true, organicFeed: true, nonGMO: false },
    yearsInOperation: 15,
    certifications: ['Certified Humane'],
    profileImage: 'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?w=400',
    fulfillmentRate: 0.99,
    averageRating: 4.8,
    totalOrders: 208,
    reviewCount: 71,
  },
  {
    name: 'Jake Worthington',
    farmName: 'WorthFarm Honey & Herbs',
    email: 'jake@worthfarm.com',
    phone: '',
    bio: 'Beekeeper and herb grower in the West River watershed. Raw, unfiltered honey from hives that forage wildflower meadows. Culinary and medicinal herbs cut fresh to order.',
    location: { address: '23 West Elm St', city: 'Woodbridge', state: 'CT', zip: '06525', lat: 41.355, lng: -72.993 },
    practices: { noAntibiotics: false, noPesticides: true, pastureRaised: false, organicFeed: false, nonGMO: false },
    yearsInOperation: 4,
    certifications: [],
    profileImage: '',
    fulfillmentRate: 0.91,
    averageRating: 4.4,
    totalOrders: 67,
    reviewCount: 23,
  },
  {
    name: 'Maria Kowalski',
    farmName: 'Elm City Bakehouse',
    email: 'maria@elmcitybakehouse.com',
    phone: '203-555-0891',
    bio: 'Artisan bakery rooted in New Haven food culture. Long-fermented sourdoughs, seasonal fruit pies, and hand-rolled dinner rolls — baked fresh every morning with locally-milled flour.',
    location: { address: '212 Whalley Ave', city: 'New Haven', state: 'CT', zip: '06511', lat: 41.310, lng: -72.951 },
    practices: { noAntibiotics: false, noPesticides: false, pastureRaised: false, organicFeed: true, nonGMO: true },
    yearsInOperation: 6,
    certifications: ['CT Dept of Agriculture Licensed Bakery'],
    profileImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    fulfillmentRate: 0.97,
    averageRating: 4.8,
    totalOrders: 203,
    reviewCount: 67,
  },
  {
    name: 'Diane & Russell Pratt',
    farmName: 'Pratt\'s Pasture',
    email: 'diane@prattspasture.com',
    phone: '203-555-0617',
    bio: 'Grass-fed beef and pastured pork raised on 180 acres in the Connecticut countryside. We believe in transparency — visit us any Saturday for a farm tour.',
    location: { address: '76 Litchfield Tpke', city: 'Orange', state: 'CT', zip: '06477', lat: 41.277, lng: -73.031 },
    practices: { noAntibiotics: true, noPesticides: false, pastureRaised: true, organicFeed: false, nonGMO: false },
    yearsInOperation: 22,
    certifications: ['American Grassfed'],
    profileImage: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400',
    fulfillmentRate: 0.94,
    averageRating: 4.6,
    totalOrders: 178,
    reviewCount: 44,
  },
];

const productTemplates = [
  // Holloway Heritage Farm
  [
    { category: 'vegetables', name: 'Heirloom Tomato Mix', description: 'Cherokee Purple, Brandywine, and Green Zebra. Vine-ripened, no refrigeration used.', quantity: 40, unit: 'lb', price: 5.5, imageUrl: 'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=400' },
    { category: 'eggs', name: 'Pasture-Raised Eggs', description: 'Dozen eggs from heritage hens with access to 3 acres of pasture.', quantity: 60, unit: 'dozen', price: 7.0, imageUrl: 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=400' },
    { category: 'meat', name: 'Whole Pasture Chicken', description: 'Air-chilled, 4–5 lb birds. Ready to roast.', quantity: 20, unit: 'bird', price: 28.0, imageUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400' },
  ],
  // Stone Acre Farm
  [
    { category: 'vegetables', name: 'Fresh Cucumbers', description: 'English and pickling varieties, harvested daily. Crisp and tender — great raw, in salads, or pickled.', quantity: 80, unit: 'lb', price: 2.5, imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400' },
    { category: 'vegetables', name: 'Butternut Squash', description: 'Dense, naturally sweet butternut. Excellent for soups, roasting, or stuffing.', quantity: 45, unit: 'lb', price: 3.0, imageUrl: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?w=400' },
    { category: 'vegetables', name: 'Delicata Squash', description: 'Sweet, creamy delicata with an edible skin. No peeling required — just slice and roast.', quantity: 30, unit: 'ea', price: 4.0, imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400' },
    { category: 'vegetables', name: 'Summer Zucchini', description: 'Tender zucchini picked young for best flavor. Mild, versatile, and in season.', quantity: 60, unit: 'lb', price: 2.0, imageUrl: 'https://images.unsplash.com/photo-1587411768638-ec71f8e33b78?w=400' },
    { category: 'fruits', name: 'Honeycrisp Apples', description: 'Connecticut-grown Honeycrisp — crisp, sweet-tart, and picked at peak season. Perfect fresh or in a pie.', quantity: 50, unit: 'lb', price: 4.0, imageUrl: 'https://images.unsplash.com/photo-1567205088573-49b8a21da5d9?w=400' },
    { category: 'fruits', name: 'Bartlett Pears', description: 'Juicy, fragrant Bartlett pears picked at peak ripeness from shoreline orchards. Great fresh or poached.', quantity: 35, unit: 'lb', price: 3.5, imageUrl: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400' },
  ],
  // Riverstone Dairy
  [
    { category: 'dairy', name: 'Jersey Whole Milk', description: 'Non-homogenized, cream-top. Half gallon glass bottle (deposit included).', quantity: 35, unit: 'half-gal', price: 9.0, imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },
    { category: 'dairy', name: 'Fresh Chèvre', description: 'Soft goat cheese, herb-rolled or plain. 4 oz log.', quantity: 28, unit: 'log', price: 8.5, imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400' },
    { category: 'dairy', name: 'Greek-Style Yogurt', description: 'Whole milk, plain or vanilla. Thick, tangy, live cultures.', quantity: 40, unit: 'pint', price: 6.0, imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400' },
  ],
  // WorthFarm Honey & Herbs
  [
    { category: 'honey', name: 'Wildflower Raw Honey', description: 'Unfiltered, unheated. Crystallizes naturally — that\'s how you know it\'s real.', quantity: 45, unit: 'jar (12oz)', price: 14.0, imageUrl: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400' },
    { category: 'herbs', name: 'Fresh Basil', description: 'Genovese and Thai basil. Harvested morning of delivery.', quantity: 30, unit: 'bunch', price: 3.5, imageUrl: 'https://images.unsplash.com/photo-1600521408233-2d0a6b3e0a2a?w=400' },
    { category: 'herbs', name: 'Culinary Herb Bundle', description: 'Rosemary, thyme, sage, and oregano. Perfect for a Sunday roast.', quantity: 20, unit: 'bundle', price: 5.0, imageUrl: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400' },
  ],
  // Elm City Bakehouse
  [
    { category: 'grains', name: 'Country Sourdough Loaf', description: 'Naturally leavened with a 24-hour cold ferment. Open crumb, crispy crust. 2 lb loaf.', quantity: 24, unit: 'loaf', price: 9.0, imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
    { category: 'other', name: 'Pumpkin Pie', description: 'Classic New England pumpkin pie made with local sugar pumpkins and warm spices. 9-inch whole pie.', quantity: 6, unit: 'pie', price: 18.0, imageUrl: 'https://images.unsplash.com/photo-1511994298241-608e28f14fde?w=400' },
    { category: 'other', name: 'Pecan Pie', description: 'Buttery, caramel-rich pecan pie with a perfectly set filling. A farmers market classic. 9-inch.', quantity: 6, unit: 'pie', price: 20.0, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400' },
    { category: 'grains', name: 'Dinner Rolls (6-pack)', description: 'Soft, buttery rolls with a golden crust. Baked the morning of delivery.', quantity: 20, unit: '6-pack', price: 7.0, imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400' },
  ],
  // Pratt's Pasture
  [
    { category: 'meat', name: 'Grass-Fed Ground Beef', description: '85/15 blend. 1 lb vacuum-sealed. Dry-aged 14 days.', quantity: 55, unit: 'lb', price: 12.0, imageUrl: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400' },
    { category: 'meat', name: 'Heritage Pork Chops', description: 'Bone-in, 1 inch thick. Two per pack.', quantity: 30, unit: 'pack', price: 18.0, imageUrl: 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=400' },
    { category: 'meat', name: 'Beef Bone Broth Pack', description: '4 lbs of mixed marrow and knuckle bones. Rich, gelatinous.', quantity: 22, unit: 'pack', price: 15.0, imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400' },
  ],
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    await Farmer.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data');

    for (let i = 0; i < farmers.length; i++) {
      const farmer = await Farmer.create(farmers[i]);
      console.log(`Created farmer: ${farmer.farmName}`);

      for (const pt of productTemplates[i]) {
        const availabilityDate = new Date();
        availabilityDate.setDate(availabilityDate.getDate() + Math.floor(Math.random() * 7) + 1);

        await Product.create({
          ...pt,
          farmerId: farmer._id,
          farmerName: farmer.name,
          farmName: farmer.farmName,
          practices: farmer.practices,
          availabilityDate,
          inStock: true,
        });
      }
      console.log(`  → seeded ${productTemplates[i].length} products`);
    }

    console.log('\nSeed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
