const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

const addDefaultUser = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    // Configure mongoose for better connection handling
    mongoose.set('strictQuery', false);
    
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    };
    
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'usamajawad125@gmail.com' });

    if (existingUser) {
      console.log('✅ Default user already exists');
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Name:', existingUser.name);
      console.log('🔑 Role:', existingUser.role);
    } else {
      // Create default user
      const defaultUser = new User({
        email: 'usamajawad125@gmail.com',
        password: 'Spark@123',
        name: 'Admin User',
        role: 'admin',
        isActive: true
      });

      await defaultUser.save();
      console.log('✅ Default user created successfully');
      console.log('📧 Email:', defaultUser.email);
      console.log('👤 Name:', defaultUser.name);
      console.log('🔑 Role:', defaultUser.role);
      console.log('🆔 ID:', defaultUser._id);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
};

console.log('🚀 Adding default user to MongoDB...');
addDefaultUser();
