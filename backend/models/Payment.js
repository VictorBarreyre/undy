const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  secret: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Secret',
      required: true,
  },
  user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
  },
  amount: {
      type: Number,
      required: true,
  },
  paymentIntentId: {
      type: String,
      required: true,
  },
  status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed'],
      default: 'pending',
  },
  metadata: {
      originalPrice: Number,
      sellerAmount: Number,
      platformFee: Number,
      buyerMargin: Number,
      sellerMargin: Number
  }
}, { timestamps: true });