const asyncHandler = require('../utils/asyncHandler');
const Session = require('../models/Session');
const Order = require('../models/Order');
const Table = require('../models/Table');
const User = require('../models/User');

// Shared helper: validate session is active and has unpaid prepared orders
const getValidSession = async (sessionId, res) => {
  const session = await Session.findById(sessionId);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  if (session.status === 'CLOSED') {
    res.status(409);
    throw new Error('Session is already closed');
  }
  return session;
};

// Shared helper: close session + mark orders paid + free table
const closeSession = async (session, paymentMethod) => {
  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' });
  const paidAt = new Date();
  const totalAmount = parseFloat(
    orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)
  );

  await Order.updateMany(
    { session: session._id, paymentStatus: 'UNPAID' },
    { paymentStatus: 'PAID', paymentMethod, paidAt }
  );

  session.status = 'CLOSED';
  session.totalAmount = totalAmount;
  session.paymentMethod = paymentMethod;
  session.closedAt = paidAt;
  await session.save();

  await Table.findByIdAndUpdate(session.table, { status: 'FREE' });

  return { totalAmount, paidAt };
};

// @route   GET /api/cashier/tables
// @access  Private (CASHIER, OWNER, ADMIN)
const getTableBills = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ status: 'ACTIVE' })
    .populate('table', 'tableNumber floor')
    .lean();

  const bills = await Promise.all(
    sessions.map(async (session) => {
      const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' }).lean();
      const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        sessionId: session._id,
        tableId: session.table._id,
        tableNumber: session.table.tableNumber,
        totalOrders: orders.length,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        createdAt: session.createdAt,
      };
    })
  );

  res.status(200).json({ success: true, data: bills });
});

// @route   GET /api/cashier/session/:sessionId
// @access  Private (CASHIER, OWNER, ADMIN)
const getSessionDetails = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.sessionId)
    .populate('table', 'tableNumber floor')
    .lean();

  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  const orders = await Order.find({ session: req.params.sessionId })
    .select('customerName status paymentStatus items totalAmount createdAt')
    .lean();

  const totalAmount = orders
    .filter((o) => o.paymentStatus === 'UNPAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  res.status(200).json({
    success: true,
    data: { session, orders, totalAmount: parseFloat(totalAmount.toFixed(2)) },
  });
});

// @route   GET /api/cashier/session/:sessionId/upi
// @access  Private (CASHIER, OWNER, ADMIN)
const generateUpiQr = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.sessionId).lean();
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  if (session.status === 'CLOSED') {
    res.status(409);
    throw new Error('Session is already closed');
  }

  // Get unpaid amount
  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' }).lean();
  const amount = parseFloat(orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2));

  if (amount === 0) {
    res.status(409);
    throw new Error('No unpaid amount for this session');
  }

  // Get owner's UPI ID
  const owner = await User.findOne({ role: 'OWNER', upiId: { $ne: null } }).lean();
  if (!owner || !owner.upiId) {
    res.status(404);
    throw new Error('Owner UPI ID not configured. Contact the owner to set it up.');
  }

  const upiUrl = `upi://pay?pa=${encodeURIComponent(owner.upiId)}&pn=Restaurant&am=${amount}&cu=INR`;

  res.status(200).json({
    success: true,
    data: { upiUrl, amount, upiId: owner.upiId },
  });
});

// @route   PATCH /api/cashier/session/:sessionId/pay
// @access  Private (CASHIER, OWNER, ADMIN)
const processPayment = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;

  if (!paymentMethod || !['CASH', 'UPI', 'CARD'].includes(paymentMethod)) {
    res.status(400);
    throw new Error('paymentMethod must be CASH, UPI, or CARD');
  }

  const session = await getValidSession(req.params.sessionId, res);

  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' });
  if (orders.length === 0) {
    res.status(409);
    throw new Error('No unpaid orders found for this session');
  }

  const unprepared = orders.filter((o) => o.status !== 'PREPARED');
  if (unprepared.length > 0) {
    res.status(409);
    throw new Error(`${unprepared.length} order(s) not yet prepared. Kitchen must finish first.`);
  }

  // UPI: generate QR and wait for manual confirmation instead of auto-closing
  if (paymentMethod === 'UPI') {
    const owner = await User.findOne({ role: 'OWNER', upiId: { $ne: null } }).lean();
    if (!owner || !owner.upiId) {
      res.status(404);
      throw new Error('Owner UPI ID not configured.');
    }
    const amount = parseFloat(orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2));
    const upiUrl = `upi://pay?pa=${encodeURIComponent(owner.upiId)}&pn=Restaurant&am=${amount}&cu=INR`;

    return res.status(200).json({
      success: true,
      data: {
        message: 'UPI payment initiated. Share the QR with the customer, then call confirm-payment.',
        upiUrl,
        amount,
        sessionId: session._id,
      },
    });
  }

  // CASH / CARD: close immediately
  const { totalAmount, paidAt } = await closeSession(session, paymentMethod);

  res.status(200).json({
    success: true,
    data: { message: 'Payment processed successfully', totalPaid: totalAmount, paymentMethod, paidAt },
  });
});

// @route   PATCH /api/cashier/session/:sessionId/confirm-payment
// @access  Private (CASHIER, OWNER, ADMIN)
const confirmPayment = asyncHandler(async (req, res) => {
  const session = await getValidSession(req.params.sessionId, res);

  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' });
  if (orders.length === 0) {
    res.status(409);
    throw new Error('No unpaid orders to confirm');
  }

  const { totalAmount, paidAt } = await closeSession(session, 'UPI');

  res.status(200).json({
    success: true,
    data: { message: 'UPI payment confirmed. Session closed.', totalPaid: totalAmount, paidAt },
  });
});

module.exports = { getTableBills, getSessionDetails, generateUpiQr, processPayment, confirmPayment };
