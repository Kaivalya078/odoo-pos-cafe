const express = require('express');
const {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  toggleAvailability,
  getMenu,
} = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Public menu — no auth
router.get('/menu', getMenu);

// Kitchen: toggle availability only
router.patch('/:id/availability', protect, authorizeRoles('KITCHEN', 'OWNER'), toggleAvailability);

// OWNER / ADMIN: full CRUD
router.use(protect, authorizeRoles('OWNER', 'ADMIN'));
router.get('/', getAllProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
