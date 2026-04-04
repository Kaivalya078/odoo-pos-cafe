const express = require('express');
const {
  getAvailability,
  createBooking,
  getBookings,
  cancelBooking,
  completeBooking,
} = require('../controllers/bookingController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// ── PUBLIC ────────────────────────────────────────────────────────────────────
router.get('/availability', getAvailability);
router.post('/', createBooking);

// ── OWNER / ADMIN ─────────────────────────────────────────────────────────────
router.use(protect, authorizeRoles('OWNER', 'ADMIN'));
router.get('/', getBookings);
router.patch('/:id/cancel', cancelBooking);
router.patch('/:id/complete', completeBooking);

module.exports = router;
