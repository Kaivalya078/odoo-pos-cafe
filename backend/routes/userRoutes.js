const express = require('express');
const {
  getAllUsers,
  createUser,
  updateUserRole,
  getOwnerDashboard,
} = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// OWNER-only routes
router.get('/dashboard', authorizeRoles('OWNER'), getOwnerDashboard);
router.get('/', authorizeRoles('OWNER'), getAllUsers);
router.post('/', authorizeRoles('OWNER'), createUser);
router.patch('/:id/role', authorizeRoles('OWNER'), updateUserRole);

module.exports = router;
