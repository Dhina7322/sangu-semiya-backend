const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.login = async (req, res) => {
  const rawEmail = req.body.email || '';
  const email = rawEmail.toLowerCase().trim();
  const { password } = req.body;
  
  // High-availability fallback: Allow default admin login even if MongoDB is disconnected
  const isDefaultAdmin = email === 'admin@sangusemiya.com' && password === 'admin123';
  const isMongoConnected = mongoose.connection.readyState === 1;

  try {
    if (!isMongoConnected) {
      if (isDefaultAdmin) {
        return res.json({
          _id: 'fallback-admin-id',
          email: 'admin@sangusemiya.com',
          role: 'Admin',
          token: jwt.sign({ id: 'fallback-admin-id' }, process.env.JWT_SECRET, { expiresIn: '30d' }),
        });
      }
      return res.status(503).json({ message: 'Login failed: Database connection is unavailable. Use admin@sangusemiya.com for recovery access.' });
    }

    let user = await User.findOne({ email });
    
    // Auto-setup admin account for robust deployment without needing /setup endpoint
    if (!user && isDefaultAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      user = await User.create({ email, password: hashedPassword, role: 'Admin' });
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      // Force Admin role for primary email, otherwise use database role or default to Sub-Admin
      const isPrimaryAdmin = email.toLowerCase().trim() === 'admin@sangusemiya.com';
      const currentRole = isPrimaryAdmin ? 'Admin' : (user.role || 'Sub-Admin');
      
      console.log(`Login attempt: ${email}, assigned role: ${currentRole}`);
      
      res.json({
        _id: user._id,
        email: user.email,
        role: currentRole,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.setupAdmin = async (req, res) => {
  try {
    const userExists = await User.findOne({ email: 'admin@sangusemiya.com' });
    if (userExists) {
      return res.status(400).json({ message: 'Admin usually exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const user = await User.create({
      email: 'admin@sangusemiya.com',
      password: hashedPassword,
      role: 'Admin'
    });

    if (user) {
      res.status(201).json({ message: 'Admin user created. email: admin@sangusemiya.com, password: admin123' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
