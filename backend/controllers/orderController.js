const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');
const Session = require('../models/Session');

// Calculates item total from DB product data — never trusts frontend prices
const calculateItemTotal = (dbProduct, variant, addons, quantity) => {
  let basePrice = 0;

  if (variant && variant.name) {
    const matched = dbProduct.variants.find(
      (v) => v.name.toLowerCase() === variant.name.toLowerCase()
    );
    if (!matched) throw new Error(`Variant '${variant.name}' not found on product '${dbProduct.name}'`);
    basePrice = matched.price;
  }

  let addonTotal = 0;
  if (addons && addons.length > 0) {
    for (const addon of addons) {
      const matched = dbProduct.addons.find(
        (a) => a.name.toLowerCase() === addon.name.toLowerCase()
      );
      if (!matched) throw new Error(`Add-on '${addon.name}' not found on product '${dbProduct.name}'`);
      addonTotal += matched.price;
    }
  }

  return parseFloat(((basePrice + addonTotal) * quantity).toFixed(2));
};

// @route   POST /api/orders
// @access  Public (CUSTOMER)
const createOrder = asyncHandler(async (req, res) => {
  const { tableId, customerName, items } = req.body;

  if (!tableId || !customerName || !items || items.length === 0) {
    res.status(400);
    throw new Error('tableId, customerName, and at least one item are required');
  }

  // Check restaurant is open
  const restaurant = await Restaurant.findOne();
  if (!restaurant || restaurant.status === 'CLOSED') {
    res.status(403);
    throw new Error('Restaurant is currently closed. Orders cannot be placed.');
  }

  // Validate table
  const table = await Table.findById(tableId);
  if (!table) {
    res.status(404);
    throw new Error('Table not found');
  }

  // Allow orders only if FREE (first order) or OCCUPIED with active session
  let activeSession = null;
  if (table.status === 'OCCUPIED') {
    activeSession = await Session.findOne({ table: tableId, status: 'ACTIVE' });
    if (!activeSession) {
      res.status(409);
      throw new Error('Table is occupied but has no active session. Contact staff.');
    }
  }

  // Build order items with server-side price calculation
  const orderItems = [];
  let totalAmount = 0;

  for (const item of items) {
    if (!item.product || !item.quantity || item.quantity < 1) {
      res.status(400);
      throw new Error('Each item must have a product and quantity >= 1');
    }

    const dbProduct = await Product.findById(item.product);
    if (!dbProduct) {
      res.status(404);
      throw new Error(`Product not found: ${item.product}`);
    }
    if (dbProduct.availability === 'UNAVAILABLE') {
      res.status(409);
      throw new Error(`Product '${dbProduct.name}' is currently unavailable`);
    }

    const itemTotal = calculateItemTotal(dbProduct, item.variant, item.addons, item.quantity);
    totalAmount += itemTotal;

    orderItems.push({
      product: dbProduct._id,
      name: dbProduct.name,
      variant: item.variant || { name: '', price: 0 },
      addons: item.addons || [],
      quantity: item.quantity,
      itemTotal,
    });
  }

  const order = await Order.create({
    table: tableId,
    session: activeSession ? activeSession._id : null,
    customerName,
    items: orderItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  });

  res.status(201).json({ success: true, data: order });
});

// @route   GET /api/orders/pending
// @access  Private (ADMIN, OWNER)
const getPendingOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ status: 'PLACED' })
    .populate('table', 'tableNumber floor status')
    .sort({ createdAt: 1 })
    .lean();
  res.status(200).json({ success: true, data: orders });
});

// @route   PATCH /api/orders/:id/approve
// @access  Private (ADMIN, OWNER)
const approveOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.status !== 'PLACED') {
    res.status(409);
    throw new Error(`Order is already ${order.status}`);
  }

  // Find or create active session for this table
  let session = await Session.findOne({ table: order.table, status: 'ACTIVE' });
  if (!session) {
    session = await Session.create({ table: order.table });
  }

  order.status = 'APPROVED';
  order.session = session._id;
  await order.save();

  // Table becomes OCCUPIED only after admin approval
  await Table.findByIdAndUpdate(order.table, { status: 'OCCUPIED' });

  const populated = await order.populate('table', 'tableNumber floor status');
  res.status(200).json({ success: true, data: populated });
});

// @route   PATCH /api/orders/:id/reject
// @access  Private (ADMIN, OWNER)
const rejectOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.status !== 'PLACED') {
    res.status(409);
    throw new Error(`Order is already ${order.status}`);
  }

  order.status = 'REJECTED';
  await order.save();
  // Table remains FREE on rejection — no status change needed

  res.status(200).json({ success: true, data: order });
});

module.exports = { createOrder, getPendingOrders, approveOrder, rejectOrder };
