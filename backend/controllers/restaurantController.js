
const asyncHandler = require('../utils/asyncHandler');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// @route   GET /api/restaurant/last-session
// @access  Private (OWNER, ADMIN)
const getLastSessionSummary = asyncHandler(async (req, res) => {
  const restaurant = await getOrCreateRestaurant();
  if (!restaurant.lastOpenedAt || !restaurant.lastClosedAt) {
    return res.status(200).json({
      lastOpenedAt: null,
      lastClosedAt: null,
      totalRevenue: 0,
      totalOrders: 0
    });
  }
  // Get all PAID orders between lastOpenedAt and lastClosedAt
  const orders = await Order.find({
    paymentStatus: 'PAID',
    createdAt: {
      $gte: restaurant.lastOpenedAt,
      $lte: restaurant.lastClosedAt
    }
  });
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  res.status(200).json({
    lastOpenedAt: restaurant.lastOpenedAt,
    lastClosedAt: restaurant.lastClosedAt,
    totalRevenue,
    totalOrders: orders.length
  });
});
// Ensures exactly one restaurant document exists (singleton pattern)
const getOrCreateRestaurant = async () => {
  let restaurant = await Restaurant.findOne();
  if (!restaurant) {
    restaurant = await Restaurant.create({ status: 'CLOSED' });
  }
  return restaurant;
};

// @route   GET /api/restaurant/status
// @access  Public
const getRestaurantStatus = asyncHandler(async (req, res) => {
  const restaurant = await getOrCreateRestaurant();
  res.status(200).json({ status: restaurant.status });
});

// @route   PATCH /api/restaurant/toggle
// @access  Private (OWNER, ADMIN)
const toggleRestaurantStatus = asyncHandler(async (req, res) => {
  const restaurant = await getOrCreateRestaurant();
  if (restaurant.status === 'OPEN') {
    restaurant.status = 'CLOSED';
    restaurant.lastClosedAt = new Date();
  } else {
    restaurant.status = 'OPEN';
    restaurant.lastOpenedAt = new Date();
  }
  await restaurant.save();
  res.status(200).json({
    message: `Restaurant is now ${restaurant.status}`,
    status: restaurant.status,
    lastOpenedAt: restaurant.lastOpenedAt,
    lastClosedAt: restaurant.lastClosedAt,
  });
});

// @route   PATCH /api/restaurant/hours
// @access  Private (OWNER, ADMIN)
const updateHours = asyncHandler(async (req, res) => {
  const { openingHour, closingHour } = req.body;

  if (openingHour === undefined || closingHour === undefined) {
    res.status(400);
    throw new Error('openingHour and closingHour are required');
  }
  if (typeof openingHour !== 'number' || typeof closingHour !== 'number') {
    res.status(400);
    throw new Error('openingHour and closingHour must be numbers (24h format, e.g. 9, 22)');
  }
  if (closingHour <= openingHour + 1) {
    res.status(400);
    throw new Error('closingHour must be at least 1 hour after openingHour');
  }

  const restaurant = await getOrCreateRestaurant();
  restaurant.openingHour = openingHour;
  restaurant.closingHour = closingHour;
  await restaurant.save();

  res.status(200).json({
    success: true,
    data: { openingHour: restaurant.openingHour, closingHour: restaurant.closingHour },
  });
});

module.exports = { getRestaurantStatus, toggleRestaurantStatus, updateHours, getLastSessionSummary };
