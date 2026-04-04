const express = require('express');
const {
  createTable,
  getAllTables,
  getTablesByFloor,
  updateTableStatus,
  deleteTable,
} = require('../controllers/tableController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// ── PUBLIC — customers need this to select a table (no token required) ────────
router.get('/', getAllTables);

// ── OWNER / ADMIN only ────────────────────────────────────────────────────────
router.use(protect, authorizeRoles('OWNER', 'ADMIN'));
router.get('/floor/:floorId', getTablesByFloor);
router.post('/', createTable);
router.patch('/:id/status', updateTableStatus);
router.delete('/:id', deleteTable);

module.exports = router;
