const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

// Use MongoDB in production, JSON file in development
const User = process.env.NODE_ENV === 'production' 
  ? require('../models/User') 
  : require('../models/UserJSON');

const setupDefaultUser = async () => {
  try {
    // Connect to MongoDB if in production
    if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI) {
      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
    }

    // Check if user already exists
    const existingUser = process.env.NODE_ENV === 'production' 
      ? await User.findOne({ email: 'usamajawad125@gmail.com' })
      : User.findByEmail('usamajawad125@gmail.com');

    if (existingUser) {
      console.log('✅ Default user already exists');
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Name:', existingUser.name);
      console.log('🔑 Role:', existingUser.role);
    } else {
      // Create default user
      const defaultUser = {
        email: 'usamajawad125@gmail.com',
        password: 'Spark@123',
        name: 'Admin User',
        role: 'admin',
        isActive: true
      };

      const user = await User.create(defaultUser);
      console.log('✅ Default user created successfully');
      console.log('📧 Email:', user.email);
      console.log('👤 Name:', user.name);
      console.log('🔑 Role:', user.role);
      console.log('🆔 ID:', user._id);
    }

  } catch (error) {
    console.error('❌ Error setting up default user:', error.message);
    
    if (process.env.NODE_ENV === 'production') {
      console.log('💡 Make sure:');
      console.log('   - NODE_ENV is set to "production"');
      console.log('   - MONGODB_URI is properly configured');
      console.log('   - MongoDB connection is accessible');
    }
  } finally {
    // Close MongoDB connection if in production
    if (process.env.NODE_ENV === 'production') {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
    
    process.exit(0);
  }
};

// Run the script
console.log('🚀 Setting up default user...');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
setupDefaultUser();
