const asyncHandler = require('../utils/asyncHandler');
const Restaurant = require('../models/Restaurant');

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
  restaurant.status = restaurant.status === 'OPEN' ? 'CLOSED' : 'OPEN';
  await restaurant.save();
  res.status(200).json({
    message: `Restaurant is now ${restaurant.status}`,
    status: restaurant.status,
  });
});

module.exports = { getRestaurantStatus, toggleRestaurantStatus };
