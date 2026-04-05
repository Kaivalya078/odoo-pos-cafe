const express = require('express');
const {
  getOrderHistory,
  getSessionHistory,
  getRevenueSummary,
  getTopProducts,
  getCategoryRevenue,
  getPaymentBreakdown,
  getHourlyRevenue,
  getInsights,
} = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Shared: OWNER + ADMIN
router.use(protect, authorizeRoles('OWNER', 'ADMIN'));
router.get('/orders/history',    getOrderHistory);
router.get('/sessions/history',  getSessionHistory);
router.get('/reports/summary',   getRevenueSummary);
router.get('/reports/top-products', getTopProducts);

// Owner-only analytics
router.get('/reports/category-revenue',  getCategoryRevenue);
router.get('/reports/payment-breakdown', getPaymentBreakdown);
router.get('/reports/hourly-revenue',    getHourlyRevenue);
router.get('/reports/insights',          getInsights);

module.exports = router;

