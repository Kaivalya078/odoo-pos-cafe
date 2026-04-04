const express = require('express');
const { getRestaurantStatus, toggleRestaurantStatus, updateHours } = require('../controllers/restaurantController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/status', getRestaurantStatus);
router.patch('/toggle', protect, authorizeRoles('OWNER', 'ADMIN'), toggleRestaurantStatus);
router.patch('/hours', protect, authorizeRoles('OWNER', 'ADMIN'), updateHours);

module.exports = router;
