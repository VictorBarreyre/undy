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
  currency: {
    type: String,
    default: '€',
    enum: ['€', '$', '£', '¥'],
    required: true
},
  metadata: {
      originalPrice: Number,
      sellerAmount: Number,
      platformFee: Number,
      buyerMargin: Number,
      sellerMargin: Number,
      currency: String 
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);