const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Stripe payment intent ID
  paymentIntentId: {
    type: String,
    required: true,
    unique: true,
    sparse: true // This allows multiple "pending" values
  },
  
  // Stripe session ID
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Customer information
  customerEmail: {
    type: String,
    required: true
  },
  
  customerName: {
    type: String,
    required: true
  },
  
  // Package information
  packageName: {
    type: String,
    required: true
  },
  
  packagePrice: {
    type: Number,
    required: true
  },
  
  packageCurrency: {
    type: String,
    default: 'usd'
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled'],
    default: 'pending'
  },
  
  // Payment amount (in cents)
  amount: {
    type: Number,
    required: true
  },
  
  // Stripe charge ID (after successful payment)
  chargeId: {
    type: String,
    default: null
  },
  
  // Payment method details
  paymentMethod: {
    type: String,
    default: null
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  paidAt: {
    type: Date,
    default: null
  },
  
  // Webhook processing
  webhookProcessed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
paymentSchema.index({ paymentIntentId: 1 });
paymentSchema.index({ sessionId: 1 });
paymentSchema.index({ customerEmail: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
