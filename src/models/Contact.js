const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  service: {
    type: String,
    enum: [
      'Digital Marketing',
      'Web Design',
      'SEO Services',
      'Social Media Marketing',
      'Content Marketing',
      'Brand Development',
      'PPC Advertising',
      'Other'
    ],
    default: 'Other'
  },
  budget: {
    type: String,
    enum: [
      'Under $5,000',
      '$5,000 - $10,000',
      '$10,000 - $25,000',
      '$25,000 - $50,000',
      'Over $50,000',
      'Not sure'
    ],
    default: 'Not sure'
  },
  timeline: {
    type: String,
    enum: [
      'ASAP',
      'Within 1 month',
      '1-3 months',
      '3-6 months',
      '6+ months',
      'Just exploring'
    ],
    default: 'Just exploring'
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  source: {
    type: String,
    default: 'website',
    enum: ['website', 'phone', 'email', 'referral', 'social']
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  adminNotes: [{
    note: {
      type: String,
      required: true,
      trim: true
    },
    addedBy: {
      type: String,
      default: 'System'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastContacted: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }]
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

// Pre-save middleware
contactSchema.pre('save', function(next) {
  // Auto-assign priority based on service and budget
  if (this.budget === 'Over $50,000' || this.timeline === 'ASAP') {
    this.priority = 'high';
  } else if (this.budget === '$25,000 - $50,000' || this.timeline === 'Within 1 month') {
    this.priority = 'medium';
  } else {
    this.priority = 'low';
  }
  next();
});

module.exports = mongoose.model('Contact', contactSchema);
