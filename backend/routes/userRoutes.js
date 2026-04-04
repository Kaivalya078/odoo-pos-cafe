const express = require('express');
const {
  getAllUsers,
  createUser,
  updateUserRole,
  getOwnerDashboard,
  getUpiId,
  updateUpiId,
} = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', authorizeRoles('OWNER'), getOwnerDashboard);
router.get('/', authorizeRoles('OWNER'), getAllUsers);
router.post('/', authorizeRoles('OWNER'), createUser);
router.get('/upi', authorizeRoles('OWNER'), getUpiId);          // must be before /:id/role
router.patch('/upi', authorizeRoles('OWNER'), updateUpiId);     // must be before /:id/role
router.patch('/:id/role', authorizeRoles('OWNER'), updateUserRole);

module.exports = router;
