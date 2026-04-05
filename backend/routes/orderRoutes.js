const express = require('express');
const { createOrder, getPendingOrders, approveOrder, rejectOrder } = require('../controllers/orderController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// ── CUSTOMER routes ───────────────────────────────────────────────────────────
router.post('/', createOrder);

// ── CASHIER / OWNER / ADMIN routes ───────────────────────────────────────────
router.use(protect, authorizeRoles('CASHIER', 'OWNER', 'ADMIN'));
router.get('/pending', getPendingOrders);
router.patch('/:id/approve', approveOrder);
router.patch('/:id/reject', rejectOrder);

module.exports = router;
