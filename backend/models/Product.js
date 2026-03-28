import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    farmerName: String,
    farmName: String,
    category: {
      type: String,
      enum: ['vegetables', 'fruits', 'meat', 'dairy', 'eggs', 'herbs', 'honey', 'grains', 'other'],
      required: true,
    },
    name: { type: String, required: true },
    description: String,
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'lb' },
    price: { type: Number, required: true },
    availabilityDate: { type: Date },
    practices: {
      noAntibiotics: Boolean,
      noPesticides: Boolean,
      pastureRaised: Boolean,
      organicFeed: Boolean,
      nonGMO: Boolean,
    },
    inStock: { type: Boolean, default: true },
    imageUrl: String,
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);
