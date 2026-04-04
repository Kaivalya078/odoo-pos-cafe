const express = require('express');
const { getRestaurantStatus, toggleRestaurantStatus } = require('../controllers/restaurantController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/status', getRestaurantStatus);
router.patch('/toggle', protect, authorizeRoles('OWNER', 'ADMIN'), toggleRestaurantStatus);

module.exports = router;
