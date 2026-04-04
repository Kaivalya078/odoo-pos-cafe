const express = require('express');
const {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  toggleAvailability,
  getKitchenProducts,
} = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// ── KITCHEN routes ────────────────────────────────────────────────────────────
// Declared BEFORE the OWNER/ADMIN router.use() guard below
router.get('/kitchen', protect, authorizeRoles('KITCHEN', 'OWNER'), getKitchenProducts);
router.patch('/:id/availability', protect, authorizeRoles('KITCHEN', 'OWNER'), toggleAvailability);

// ── OWNER / ADMIN routes ──────────────────────────────────────────────────────
router.use(protect, authorizeRoles('OWNER', 'ADMIN'));
router.get('/', getAllProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
