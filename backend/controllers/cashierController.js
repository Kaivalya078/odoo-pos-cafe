const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const Session = require('../models/Session');
const Order = require('../models/Order');
const Table = require('../models/Table');
const User = require('../models/User');

// Lazy-init Razorpay so server still boots if SDK not installed
let razorpay = null;
function getRazorpay() {
  if (!razorpay) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const getValidSession = async (sessionId, res) => {
  const session = await Session.findById(sessionId);
  if (!session) { res.status(404); throw new Error('Session not found'); }
  if (session.status === 'CLOSED') { res.status(409); throw new Error('Session is already closed'); }
  return session;
};

const closeSession = async (session, paymentMethod) => {
  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' });
  const paidAt = new Date();
  const totalAmount = parseFloat(orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2));

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

// ── GET /api/cashier/tables ────────────────────────────────────────────────

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

// ── GET /api/cashier/session/:sessionId ───────────────────────────────────

const getSessionDetails = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.sessionId)
    .populate('table', 'tableNumber floor')
    .lean();

  if (!session) { res.status(404); throw new Error('Session not found'); }

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

// ── GET /api/cashier/session/:sessionId/upi ───────────────────────────────

const generateUpiQr = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.sessionId).lean();
  if (!session) { res.status(404); throw new Error('Session not found'); }
  if (session.status === 'CLOSED') { res.status(409); throw new Error('Session is already closed'); }

  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' }).lean();
  const amount = parseFloat(orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2));

  if (amount === 0) { res.status(409); throw new Error('No unpaid amount for this session'); }

  const owner = await User.findOne({ role: 'OWNER', upiId: { $ne: null } }).lean();
  if (!owner?.upiId) {
    res.status(404);
    throw new Error('Owner UPI ID not configured. Ask the owner to set it up in their panel.');
  }

  const upiUrl = `upi://pay?pa=${encodeURIComponent(owner.upiId)}&pn=Restaurant&am=${amount}&cu=INR`;
  res.status(200).json({ success: true, data: { upiUrl, amount, upiId: owner.upiId } });
});

// ── GET /api/cashier/session/:sessionId/razorpay-order ────────────────────
// Creates a Razorpay order for CARD payments

const createRazorpayOrder = asyncHandler(async (req, res) => {
  const session = await getValidSession(req.params.sessionId, res);

  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' }).lean();
  if (orders.length === 0) { res.status(409); throw new Error('No unpaid orders for this session'); }

  const unprepared = orders.filter((o) => o.status !== 'PREPARED');
  if (unprepared.length > 0) {
    res.status(409);
    throw new Error(`${unprepared.length} order(s) not yet prepared by kitchen`);
  }

  const totalAmount = parseFloat(orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2));
  const amountInPaise = Math.round(totalAmount * 100);

  const rzpOrder = await getRazorpay().orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: req.params.sessionId,
  });

  res.status(200).json({
    success: true,
    data: {
      orderId: rzpOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
    },
  });
});

// ── POST /api/cashier/session/:sessionId/verify-razorpay ─────────────────
// Verifies Razorpay signature → closes session

const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required');
  }

  // Verify HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error('Payment signature verification failed');
  }

  const session = await getValidSession(req.params.sessionId, res);
  const { totalAmount, paidAt } = await closeSession(session, 'CARD');

  res.status(200).json({
    success: true,
    data: {
      message: 'Razorpay card payment verified and session closed',
      totalPaid: totalAmount,
      paymentMethod: 'CARD',
      razorpayPaymentId: razorpay_payment_id,
      paidAt,
    },
  });
});

// ── PATCH /api/cashier/session/:sessionId/pay ─────────────────────────────
// Handles CASH and UPI (legacy flow — CARD now goes through Razorpay)

const processPayment = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;

  if (!paymentMethod || !['CASH', 'UPI', 'CARD'].includes(paymentMethod)) {
    res.status(400);
    throw new Error('paymentMethod must be CASH, UPI, or CARD');
  }

  const session = await getValidSession(req.params.sessionId, res);

  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' });
  if (orders.length === 0) { res.status(409); throw new Error('No unpaid orders found for this session'); }

  const unprepared = orders.filter((o) => o.status !== 'PREPARED');
  if (unprepared.length > 0) {
    res.status(409);
    throw new Error(`${unprepared.length} order(s) not yet prepared. Kitchen must finish first.`);
  }

  // UPI — return QR data, do NOT close session yet
  if (paymentMethod === 'UPI') {
    const owner = await User.findOne({ role: 'OWNER', upiId: { $ne: null } }).lean();
    if (!owner?.upiId) { res.status(404); throw new Error('Owner UPI ID not configured.'); }
    const amount = parseFloat(orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2));
    const upiUrl = `upi://pay?pa=${encodeURIComponent(owner.upiId)}&pn=Restaurant&am=${amount}&cu=INR`;
    return res.status(200).json({
      success: true,
      data: { message: 'Scan QR and confirm after payment', upiUrl, amount, sessionId: session._id },
    });
  }

  // CASH — close immediately
  const { totalAmount, paidAt } = await closeSession(session, paymentMethod);
  res.status(200).json({
    success: true,
    data: { message: 'Payment processed', totalPaid: totalAmount, paymentMethod, paidAt },
  });
});

// ── PATCH /api/cashier/session/:sessionId/confirm-payment ─────────────────
// Confirms UPI payment manually after cashier verifies

const confirmPayment = asyncHandler(async (req, res) => {
  const session = await getValidSession(req.params.sessionId, res);

  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' });
  if (orders.length === 0) { res.status(409); throw new Error('No unpaid orders to confirm'); }

  const { totalAmount, paidAt } = await closeSession(session, 'UPI');

  res.status(200).json({
    success: true,
    data: { message: 'UPI payment confirmed. Session closed.', totalPaid: totalAmount, paidAt },
  });
});

module.exports = {
  getTableBills,
  getSessionDetails,
  generateUpiQr,
  createRazorpayOrder,
  verifyRazorpayPayment,
  processPayment,
  confirmPayment,
};
