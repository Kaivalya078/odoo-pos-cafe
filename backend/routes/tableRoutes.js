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

router.use(protect, authorizeRoles('OWNER', 'ADMIN'));

// /floor/:floorId must be declared before /:id to avoid param conflicts
router.get('/floor/:floorId', getTablesByFloor);

router.get('/', getAllTables);
router.post('/', createTable);
router.patch('/:id/status', updateTableStatus);
router.delete('/:id', deleteTable);

module.exports = router;
