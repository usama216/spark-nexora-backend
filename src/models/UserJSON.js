const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataFile = path.join(__dirname, '../../data/users.json');

// Ensure data directory exists (only in development)
const dataDir = path.dirname(dataFile);
if (process.env.NODE_ENV !== 'production' && !fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (error) {
    console.log('⚠️  Could not create data directory, using in-memory storage');
  }
}

// Initialize default admin user if file doesn't exist (only in development)
const initializeDefaultUser = async () => {
  if (process.env.NODE_ENV === 'production') {
    return; // Skip file operations in production
  }

  try {
    if (!fs.existsSync(dataFile)) {
      const defaultUser = {
        _id: '1',
        email: 'usamajawad125@gmail.com',
        password: await bcrypt.hash('Spark@123', 12), // Hash the password
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        lastLogin: null,
        loginAttempts: 0,
        lockUntil: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(dataFile, JSON.stringify([defaultUser], null, 2));
      console.log('✅ Default admin user created');
    }
  } catch (error) {
    console.log('⚠️  Could not create users file, using in-memory storage');
  }
};

class UserJSON {
  // In-memory storage for production fallback
  static inMemoryUsers = [];

  static async create(userData) {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('User creation not supported in production - use MongoDB');
      }

      await initializeDefaultUser();
      const users = this.getAll();
      
      // Check if user already exists
      if (users.find(user => user.email === userData.email)) {
        throw new Error('User already exists');
      }
      
      const newUser = {
        _id: Date.now().toString(),
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      users.push(newUser);
      this.saveAll(users);
      return newUser;
    } catch (error) {
      throw error;
    }
  }

  static getAll() {
    if (process.env.NODE_ENV === 'production') {
      return this.inMemoryUsers;
    }

    try {
      initializeDefaultUser(); // Ensure default user exists
      const data = fs.readFileSync(dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return this.inMemoryUsers;
    }
  }

  static findByEmail(email) {
    if (process.env.NODE_ENV === 'production') {
      // Return null in production to force MongoDB usage
      return null;
    }

    const users = this.getAll();
    return users.find(user => user.email === email);
  }

  static findById(id) {
    if (process.env.NODE_ENV === 'production') {
      // Return null in production to force MongoDB usage
      return null;
    }

    const users = this.getAll();
    return users.find(user => user._id === id);
  }

  static findByIdAndUpdate(id, updateData) {
    if (process.env.NODE_ENV === 'production') {
      // Return null in production to force MongoDB usage
      return null;
    }

    const users = this.getAll();
    const index = users.findIndex(user => user._id === id);
    
    if (index === -1) {
      return null;
    }

    users[index] = {
      ...users[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.saveAll(users);
    return users[index];
  }

  static findByIdAndDelete(id) {
    if (process.env.NODE_ENV === 'production') {
      // Return null in production to force MongoDB usage
      return null;
    }

    const users = this.getAll();
    const index = users.findIndex(user => user._id === id);
    
    if (index === -1) {
      return null;
    }

    const deletedUser = users.splice(index, 1)[0];
    this.saveAll(users);
    return deletedUser;
  }

  static saveAll(users) {
    if (process.env.NODE_ENV === 'production') {
      // Don't save to file in production
      this.inMemoryUsers = users;
      return;
    }

    try {
      fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
    } catch (error) {
      console.log('⚠️  Could not save to file, using in-memory storage');
      this.inMemoryUsers = users;
    }
  }

  // Helper method to compare password
  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
}

module.exports = UserJSON;
