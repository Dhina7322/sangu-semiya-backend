const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      return next(); // Return here!
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' }); // Return here!
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' }); // Return here!
  }
};

const isAdmin = (req, res, next) => {
  const isPrimaryAdmin = req.user && req.user.email === 'admin@sangusemiya.com';
  if (req.user && (req.user.role === 'Admin' || isPrimaryAdmin)) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, isAdmin };
