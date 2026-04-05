const express = require('express');
const { getKitchenOrders, updateItemPreparation, advanceOrder } = require('../controllers/kitchenController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, authorizeRoles('KITCHEN', 'OWNER', 'ADMIN'));

router.get('/orders', getKitchenOrders);
router.patch('/orders/:orderId/items/:itemId', updateItemPreparation);
router.patch('/orders/:orderId/advance', advanceOrder);

module.exports = router;
