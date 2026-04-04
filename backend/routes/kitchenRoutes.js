const express = require('express');
const { getKitchenOrders, updateItemPreparation } = require('../controllers/kitchenController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, authorizeRoles('KITCHEN','OWNER'));

router.get('/orders', getKitchenOrders);
router.patch('/orders/:orderId/items/:itemId', updateItemPreparation);

module.exports = router;
