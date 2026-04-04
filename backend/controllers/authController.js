const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

// Generate JWT with user id and role
const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.status(200).json({
    token: generateToken(user._id, user.role),
    user: { id: user._id, name: user.name, role: user.role },
  });
});

// @route   POST /api/auth/create-user
// @access  Private (OWNER only)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('name, email, password, and role are all required');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error('A user with that email already exists');
  }

  const user = await User.create({ name, email, password, role });

  res.status(201).json({
    message: 'User created successfully',
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

module.exports = { loginUser, createUser };
