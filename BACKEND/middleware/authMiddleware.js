const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.protect = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists in database
    db.query('SELECT * FROM users WHERE user_id = ?', [decoded.id], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Add user to request object
      req.user = {
        id: decoded.id,
        email: decoded.email
      };
      next();
    });
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

exports.isAdmin = (req, res, next) => {
  // Check if user exists and has admin role
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Query the database to check if user has admin role
  db.query('SELECT is_admin FROM users WHERE user_id = ?', [req.user.id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0 || !results[0].is_admin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // User is an admin, proceed
    next();
  });
};
