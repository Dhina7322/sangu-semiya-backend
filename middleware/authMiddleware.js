const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabase');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Support high-availability fallback admin before tables are created
      if (decoded.id === 'fallback-admin' || decoded.id === 'fallback-admin-id') {
        req.user = { id: 'fallback-admin', email: 'admin@sangusemiya.com', role: 'Admin' };
        return next();
      }
      
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', decoded.id)
        .single();

      if (error || !user) throw new Error('User not found');
      
      req.user = user;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
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
