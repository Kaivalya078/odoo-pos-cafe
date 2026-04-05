const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');
const Session = require('../models/Session');
const { getUpcomingBooking, getBookingWarning } = require('./bookingController');

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
  const { tableId, customerName, customerMobile, items } = req.body;

  if (!tableId || !items || items.length === 0) {
    res.status(400);
    throw new Error('tableId and at least one item are required');
  }

  if (customerMobile && !/^\d{10}$/.test(customerMobile)) {
    res.status(400);
    throw new Error('customerMobile must be exactly 10 digits');
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

  // Allow orders only if FREE or OCCUPIED with an active session
  let activeSession = null;
  if (table.status === 'OCCUPIED') {
    activeSession = await Session.findOne({ table: tableId, status: 'ACTIVE' });
    if (!activeSession) {
      res.status(409);
      throw new Error('Table is occupied but has no active session. Contact staff.');
    }
  }

  // Check for an upcoming booking within 15 min
  const upcomingBooking = await getUpcomingBooking(tableId);

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
      category: dbProduct.category || 'Uncategorised',
      variant: item.variant || { name: '', price: 0 },
      addons: item.addons || [],
      quantity: item.quantity,
      itemTotal,
    });
  }

  const totalAmountFixed = parseFloat(totalAmount.toFixed(2));
  const cashbackAmount = parseFloat((totalAmountFixed * 0.10).toFixed(2));

  // ── No conflict: auto-approve, create session, mark table OCCUPIED ─────────
  if (!upcomingBooking) {
    let session = activeSession;
    if (!session) {
      session = await Session.create({ table: tableId });
    }

    const order = await Order.create({
      table: tableId,
      session: session._id,
      customerName: customerName?.trim() || 'Customer',
      customerMobile: customerMobile || null,
      items: orderItems,
      totalAmount: totalAmountFixed,
      cashbackAmount,
      status: 'APPROVED',
    });

    await Table.findByIdAndUpdate(tableId, { status: 'OCCUPIED' });

    return res.status(201).json({ success: true, data: order, bookingWarning: null });
  }

  // ── Booking conflict: stay PLACED, cashier must review ────────────────────
  const bookingWarning = `⚠️ Table ${table.tableNumber} has a reservation at ${new Date(upcomingBooking.startTime).toLocaleTimeString()} (within 15 min). A cashier will review before sending to the kitchen.`;

  const order = await Order.create({
    table: tableId,
    session: activeSession ? activeSession._id : null,
    customerName: customerName?.trim() || 'Customer',
    customerMobile: customerMobile || null,
    items: orderItems,
    totalAmount: totalAmountFixed,
    cashbackAmount,
    // status defaults to 'PLACED'
  });

  res.status(201).json({ success: true, data: order, bookingWarning });
});

// @route   GET /api/orders/pending
// @access  Private (CASHIER, OWNER, ADMIN)
const getPendingOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ status: 'PLACED' })
    .populate('table', 'tableNumber floor status')
    .sort({ createdAt: 1 })
    .lean();

  // Attach booking warning so cashier can make an informed decision
  const ordersWithWarnings = await Promise.all(
    orders.map(async (order) => {
      const warning = await getBookingWarning(order.table._id);
      return {
        ...order,
        bookingWarning: warning
          ? `⚠️ Table ${order.table.tableNumber} has a reservation at ${new Date(warning.startTime).toLocaleTimeString()} for ${warning.name} (${warning.phone}). Approve only if this order can be completed before then, or redirect the customer.`
          : null,
      };
    })
  );

  res.status(200).json({ success: true, data: ordersWithWarnings });
});

// @route   PATCH /api/orders/:id/approve
// @access  Private (CASHIER, OWNER, ADMIN)
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

  // Table becomes OCCUPIED after cashier approval
  await Table.findByIdAndUpdate(order.table, { status: 'OCCUPIED' });

  const populated = await order.populate('table', 'tableNumber floor status');
  res.status(200).json({ success: true, data: populated });
});

// @route   PATCH /api/orders/:id/reject
// @access  Private (CASHIER, OWNER, ADMIN)
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
  // Table remains FREE on rejection

  res.status(200).json({ success: true, data: order });
});

module.exports = { createOrder, getPendingOrders, approveOrder, rejectOrder };
