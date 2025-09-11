const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config({ path: './config.env' });

const ensureDefaultUser = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    mongoose.set('strictQuery', false);
    
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
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
      console.log('🆔 ID:', existingUser._id);
    } else {
      console.log('➕ Creating default user...');
      
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

console.log('🚀 Ensuring default user exists in MongoDB...');
ensureDefaultUser();
