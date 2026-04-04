const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const VALID_ROLES = ['OWNER', 'ADMIN', 'KITCHEN', 'CASHIER'];

// @route   GET /api/users
// @access  Private (OWNER)
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').lean();
  res.status(200).json({ success: true, data: users });
});

// @route   POST /api/users
// @access  Private (OWNER)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('name, email, password, and role are all required');
  }

  if (!VALID_ROLES.includes(role)) {
    res.status(400);
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error('A user with that email already exists');
  }

  const user = await User.create({ name, email, password, role });

  res.status(201).json({
    success: true,
    data: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// @route   PATCH /api/users/:id/role
// @access  Private (OWNER)
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!role || !VALID_ROLES.includes(role)) {
    res.status(400);
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  // Prevent owner from accidentally locking themselves out
  if (req.params.id === req.user._id.toString()) {
    res.status(403);
    throw new Error('You cannot change your own role');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({ success: true, data: user });
});

// @route   GET /api/users/dashboard
// @access  Private (OWNER)
const getOwnerDashboard = asyncHandler(async (req, res) => {
  const [users, restaurant] = await Promise.all([
    User.find().select('-password').lean(),
    Restaurant.findOne().lean(),
  ]);

  // Group users by role
  const byRole = VALID_ROLES.reduce((acc, role) => {
    acc[role] = users.filter((u) => u.role === role);
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      totalUsers: users.length,
      byRole,
      restaurant: {
        status: restaurant ? restaurant.status : 'CLOSED',
      },
    },
  });
});

// @route   GET /api/users/upi
// @access  Private (OWNER)
const getUpiId = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('upiId').lean();
  res.status(200).json({ success: true, data: { upiId: user?.upiId || null } });
});

// @route   PATCH /api/users/upi
// @access  Private (OWNER)
const updateUpiId = asyncHandler(async (req, res) => {
  const { upiId } = req.body;

  if (!upiId || !upiId.trim()) {
    res.status(400);
    throw new Error('upiId is required');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { upiId: upiId.trim() },
    { new: true }
  ).select('-password');

  res.status(200).json({ success: true, data: { upiId: user.upiId } });
});

module.exports = { getAllUsers, createUser, updateUserRole, getOwnerDashboard, getUpiId, updateUpiId };

