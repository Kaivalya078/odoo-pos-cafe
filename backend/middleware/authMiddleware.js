const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

// Verify JWT and attach user to req
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorised, no token provided');
  }

  const token = authHeader.split(' ')[1];

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id).select('-password');

  if (!req.user) {
    res.status(401);
    throw new Error('Not authorised, user no longer exists');
  }

  next();
});

// Restrict access to specific roles
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Role '${req.user.role}' is not allowed to access this route`);
  }
  next();
};

module.exports = { protect, authorizeRoles };
