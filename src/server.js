const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const connectDB = async () => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connected successfully');
    } else {
      console.log('✅ Using JSON file storage for development');
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    // Fallback to JSON storage if MongoDB fails
    console.log('⚠️  Falling back to JSON file storage');
  }
};

// Connect to database
connectDB();

// Middleware - Completely unrestricted CORS
app.use(cors({
  origin: '*', // Allow ALL origins without any restrictions
  credentials: false, // Set to false when using wildcard origin
  methods: '*', // Allow ALL HTTP methods
  allowedHeaders: '*', // Allow ALL headers
  exposedHeaders: '*', // Expose ALL headers
  optionsSuccessStatus: 200
}));

// No restrictions - API is completely open

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Handle preflight requests - Completely unrestricted
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  res.sendStatus(200);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Spark Nexora Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
