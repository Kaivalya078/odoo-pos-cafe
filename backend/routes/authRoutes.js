const express = require('express');
const { loginUser, createUser } = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', loginUser);
router.post('/create-user', protect, authorizeRoles('OWNER'), createUser);

module.exports = router;
