import mongoose from 'mongoose';

const practicesSchema = new mongoose.Schema({
  noAntibiotics: { type: Boolean, default: false },
  noPesticides: { type: Boolean, default: false },
  pastureRaised: { type: Boolean, default: false },
  organicFeed: { type: Boolean, default: false },
  nonGMO: { type: Boolean, default: false },
});

const farmerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    farmName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    bio: { type: String },
    location: {
      address: String,
      city: String,
      state: String,
      zip: String,
      lat: Number,
      lng: Number,
    },
    practices: practicesSchema,
    yearsInOperation: { type: Number, default: 1 },
    certifications: [String],
    profileImage: { type: String },
    // Trust score components
    fulfillmentRate: { type: Number, default: 0.95 }, // 0–1
    averageRating: { type: Number, default: 4.5 },   // 0–5
    totalOrders: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Virtual: trust score computed from fields
farmerSchema.virtual('trustScore').get(function () {
  return computeTrustScore(this);
});

farmerSchema.set('toJSON', { virtuals: true });
farmerSchema.set('toObject', { virtuals: true });

export function computeTrustScore(farmer) {
  // 1. Profile completeness (20%)
  const profileFields = ['name', 'farmName', 'email', 'phone', 'bio',
    'location.city', 'certifications', 'profileImage'];
  let filled = 0;
  if (farmer.name) filled++;
  if (farmer.farmName) filled++;
  if (farmer.email) filled++;
  if (farmer.phone) filled++;
  if (farmer.bio && farmer.bio.length > 20) filled++;
  if (farmer.location?.city) filled++;
  if (farmer.certifications?.length > 0) filled++;
  if (farmer.profileImage) filled++;
  const completeness = (filled / profileFields.length) * 20;

  // 2. Transparency practices (40%)
  const practices = farmer.practices || {};
  const toggles = ['noAntibiotics', 'noPesticides', 'pastureRaised', 'organicFeed', 'nonGMO'];
  const trueCount = toggles.filter((k) => practices[k]).length;
  const transparency = (trueCount / toggles.length) * 40;

  // 3. Reliability (30%) — fulfillment rate
  const reliability = (farmer.fulfillmentRate ?? 0.95) * 30;

  // 4. Community (10%) — average rating / 5
  const community = ((farmer.averageRating ?? 4.5) / 5) * 10;

  return Math.round(completeness + transparency + reliability + community);
}

export default mongoose.model('Farmer', farmerSchema);
