const express = require('express');
const { createFloor, getAllFloors } = require('../controllers/floorController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, authorizeRoles('OWNER', 'ADMIN'));

router.get('/', getAllFloors);
router.post('/', createFloor);

module.exports = router;
