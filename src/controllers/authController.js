const jwt = require('jsonwebtoken');

// Use MongoDB in production, JSON file in development
const User = process.env.NODE_ENV === 'production' 
  ? require('../models/User') 
  : require('../models/UserJSON');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
};

// User Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = process.env.NODE_ENV === 'production' 
      ? await User.findOne({ email: email.toLowerCase() })
      : User.findByEmail(email.toLowerCase());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked && user.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Compare password
    const isPasswordValid = process.env.NODE_ENV === 'production' 
      ? await user.comparePassword(password)
      : await User.comparePassword(password, user.password);

    if (!isPasswordValid) {
      // Increment login attempts
      if (process.env.NODE_ENV === 'production') {
        await user.incLoginAttempts();
      } else {
        // For JSON storage, we'll handle this differently
        const users = User.getAll();
        const userIndex = users.findIndex(u => u._id === user._id);
        if (userIndex !== -1) {
          users[userIndex].loginAttempts = (users[userIndex].loginAttempts || 0) + 1;
          if (users[userIndex].loginAttempts >= 5) {
            users[userIndex].lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
          }
          User.saveAll(users);
        }
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Reset login attempts on successful login
    if (process.env.NODE_ENV === 'production') {
      await user.resetLoginAttempts();
    } else {
      // For JSON storage
      const users = User.getAll();
      const userIndex = users.findIndex(u => u._id === user._id);
      if (userIndex !== -1) {
        users[userIndex].loginAttempts = 0;
        users[userIndex].lockUntil = null;
        users[userIndex].lastLogin = new Date().toISOString();
        User.saveAll(users);
      }
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Prepare user data (without password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin || new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Verify Token (for protected routes)
const verifyToken = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID
    const user = process.env.NODE_ENV === 'production' 
      ? await User.findById(decoded.userId)
      : User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Return user data
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: userData
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Token verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Logout (client-side token removal)
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from client-side storage.'
  });
};

module.exports = {
  login,
  verifyToken,
  logout
};
