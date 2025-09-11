const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  // All fields are completely optional and unrestricted
  name: String,
  email: String,
  phone: String,
  company: String,
  subject: String,
  message: String,
  service: String,
  budget: String,
  timeline: String,
  status: {
    type: String,
    default: 'new'
  },
  priority: {
    type: String,
    default: 'medium'
  },
  source: {
    type: String,
    default: 'website'
  },
  ipAddress: String,
  userAgent: String,
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
  lastContacted: Date,
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ priority: 1 });

// Virtual for formatted date
contactSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// No validation middleware - completely unrestricted

module.exports = mongoose.model('Contact', contactSchema);
