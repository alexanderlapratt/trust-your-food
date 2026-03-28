import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' },
  farmName: String,
  productName: String,
  quantity: Number,
  price: Number,
});

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    deliveryAddress: String,
    items: [orderItemSchema],
    totalPrice: Number,
    deliveryWindow: {
      day: String,
      date: Date,
      startTime: String,
      endTime: String,
      label: String,
    },
    routeSummary: [
      {
        farmName: String,
        address: String,
        order: Number,
      },
    ],
    deliveryType: {
      type: String,
      enum: ['group', 'direct'],
      default: 'group',
    },
    deliveryFee: { type: Number, default: 2.99 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
