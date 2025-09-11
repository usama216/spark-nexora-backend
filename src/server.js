const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection - Always use MongoDB for simplicity
const connectDB = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Configure mongoose for better connection handling
      mongoose.set('strictQuery', false);
      
      console.log('🔌 Attempting to connect to MongoDB...');
      console.log('📍 MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
      
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 15000, // Keep trying to send operations for 15 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        connectTimeoutMS: 15000, // Give up initial connection after 15 seconds
      };

      await mongoose.connect(process.env.MONGODB_URI, options);
      console.log('✅ MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });
      
      resolve();
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('💡 Make sure MONGODB_URI is set correctly in your environment variables');
      console.log('💡 Check if your MongoDB Atlas cluster is accessible');
      console.log('💡 Verify your network connection and firewall settings');
      reject(error);
    }
  });
};

// Connect to database first, then start server
const startServer = async () => {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Database connection attempt ${retryCount + 1}/${maxRetries}`);
      
      // Connect to database first
      await connectDB();
      
      // Wait a moment for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🚀 Starting server...');
      
      // Start the server
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      });
      
      return; // Success, exit the retry loop
      
    } catch (error) {
      retryCount++;
      console.error(`❌ Database connection failed (attempt ${retryCount}/${maxRetries}):`, error.message);
      
      if (retryCount < maxRetries) {
        console.log(`⏳ Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('❌ Failed to connect to database after all retries');
        console.log('💡 Please check your MongoDB Atlas configuration');
        process.exit(1);
      }
    }
  }
};

// Start the application
startServer();

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
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({ 
      status: 'OK', 
      message: 'Spark Nexora Backend API is running',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Server startup is now handled in startServer() function
