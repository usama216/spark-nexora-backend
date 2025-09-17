const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order number (custom format)
  orderNumber: {
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
  
  customerPhone: {
    type: String,
    default: null
  },
  
  // Package details
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
  
  // Billing information
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'paid', 'processing', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  // Payment reference
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  
  // Service start date
  serviceStartDate: {
    type: Date,
    default: null
  },
  
  // Service end date (for monthly packages)
  serviceEndDate: {
    type: Date,
    default: null
  },
  
  // Additional notes
  notes: {
    type: String,
    default: null
  },
  
  // Admin notes
  adminNotes: [{
    note: String,
    addedBy: {
      type: String,
      default: 'System'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Subscription information (for recurring payments)
  isSubscription: {
    type: Boolean,
    default: false
  },
  
  subscriptionId: {
    type: String,
    default: null
  },
  
  // Renewal date for subscriptions
  nextBillingDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentId: 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Get count of orders for today
      const todayStart = new Date(year, date.getMonth(), date.getDate());
      const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);
      
      const count = await this.constructor.countDocuments({
        createdAt: { $gte: todayStart, $lt: todayEnd }
      });
      
      // Format: SN-YYYYMMDD-XXXX
      this.orderNumber = `SN-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating order number:', error);
      // Fallback order number
      this.orderNumber = `SN-${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
