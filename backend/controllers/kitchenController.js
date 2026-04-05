
const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

// @route   GET /api/kitchen/orders
// @access  Private (KITCHEN)
const getKitchenOrders = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findOne();
  if (!restaurant || restaurant.status === 'CLOSED') {
    // Restaurant is closed, show no orders
    return res.status(200).json({ success: true, data: [] });
  }
  // Only show APPROVED and PREPARING orders created after lastOpenedAt
  const filter = {
    status: { $in: ['APPROVED', 'PREPARING'] },
  };
  if (restaurant.lastOpenedAt) {
    filter.createdAt = { $gte: restaurant.lastOpenedAt };
  }
  const orders = await Order.find(filter)
    .populate('table', 'tableNumber')
    .select('customerName status items createdAt table')
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({ success: true, data: orders });
});

// @route   PATCH /api/kitchen/orders/:orderId/items/:itemId
// @access  Private (KITCHEN)
const updateItemPreparation = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.status === 'PREPARED') {
    res.status(409);
    throw new Error('Order is already fully prepared');
  }
  if (!['APPROVED', 'PREPARING'].includes(order.status)) {
    res.status(409);
    throw new Error(`Cannot update items for an order with status '${order.status}'`);
  }

  const item = order.items.id(itemId);
  if (!item) {
    res.status(404);
    throw new Error('Item not found in this order');
  }
  if (item.preparedQuantity >= item.quantity) {
    res.status(409);
    throw new Error(`Item '${item.name}' is already fully prepared`);
  }

  // Increment prepared count
  item.preparedQuantity += 1;

  // Auto-derive order status
  const allPrepared = order.items.every((i) => i.preparedQuantity >= i.quantity);
  const anyPrepared = order.items.some((i) => i.preparedQuantity > 0);

  if (allPrepared) {
    order.status = 'PREPARED';
  } else if (anyPrepared) {
    order.status = 'PREPARING';
  }

  await order.save();

  // NOTE: Cashback is credited AFTER payment is completed (in cashierController).
  // This ensures customers cannot redeem cashback earned on the current order.

  await order.populate('table', 'tableNumber');
  res.status(200).json({ success: true, data: order });
});

// @route   PATCH /api/kitchen/orders/:orderId/advance
// @access  Private (KITCHEN)
// Advances the entire order to the next status in one action:
//   APPROVED  → sets all items preparedQuantity = quantity, status = PREPARING
//   PREPARING → sets all items preparedQuantity = quantity, status = PREPARED
const advanceOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) { res.status(404); throw new Error('Order not found'); }

  if (!['APPROVED', 'PREPARING'].includes(order.status)) {
    res.status(409);
    throw new Error(`Cannot advance an order with status '${order.status}'`);
  }

  // Determine next status
  const nextStatus = order.status === 'APPROVED' ? 'PREPARING' : 'PREPARED';

  // Mark all items as fully prepared
  order.items.forEach((item) => {
    item.preparedQuantity = item.quantity;
  });
  order.status = nextStatus;

  await order.save();

  // NOTE: Cashback is credited AFTER payment is completed (in cashierController).
  // This ensures customers cannot redeem cashback earned on the current order.

  await order.populate('table', 'tableNumber');
  res.status(200).json({ success: true, data: order });
});

module.exports = { getKitchenOrders, updateItemPreparation, advanceOrder };
