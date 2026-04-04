const express = require('express');
const {
  getOrderHistory,
  getSessionHistory,
  getRevenueSummary,
  getTopProducts,
} = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, authorizeRoles('OWNER', 'ADMIN'));

router.get('/orders/history', getOrderHistory);
router.get('/sessions/history', getSessionHistory);
router.get('/reports/summary', getRevenueSummary);
router.get('/reports/top-products', getTopProducts);

module.exports = router;
