const express = require('express');
const {
  getTableBills,
  getSessionDetails,
  generateUpiQr,
  createRazorpayOrder,
  verifyRazorpayPayment,
  processPayment,
  confirmPayment,
} = require('../controllers/cashierController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, authorizeRoles('CASHIER', 'OWNER', 'ADMIN'));

router.get('/tables', getTableBills);
router.get('/session/:sessionId', getSessionDetails);
router.get('/session/:sessionId/upi', generateUpiQr);
router.get('/session/:sessionId/razorpay-order', createRazorpayOrder);
router.post('/session/:sessionId/verify-razorpay', verifyRazorpayPayment);
router.patch('/session/:sessionId/pay', processPayment);
router.patch('/session/:sessionId/confirm-payment', confirmPayment);

module.exports = router;
