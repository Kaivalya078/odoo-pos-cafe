const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const Session = require('../models/Session');
const Order = require('../models/Order');
const Table = require('../models/Table');
const User = require('../models/User');
const Customer = require('../models/Customer');
const { deductCashback } = require('./customerController');

const TAX_RATE = 0.05; // 5% GST
const applyTax = (subtotal) => ({
  subtotal: parseFloat(subtotal.toFixed(2)),
  taxAmount: parseFloat((subtotal * TAX_RATE).toFixed(2)),
  grandTotal: parseFloat((subtotal * (1 + TAX_RATE)).toFixed(2)),
});

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

// Process cashback redemptions — deduct from each customer's balance
// cashbackRedemptions: [{ mobile, amountToRedeem }]
const processCashbackRedemptions = async (redemptions = []) => {
  let totalRedeemed = 0;
  for (const { mobile, amountToRedeem } of redemptions) {
    if (!mobile || !amountToRedeem || amountToRedeem <= 0) continue;
    const deducted = await deductCashback(mobile, amountToRedeem);
    totalRedeemed += deducted;
  }
  return parseFloat(totalRedeemed.toFixed(2));
};

const closeSession = async (session, paymentMethod, cashbackRedemptions = []) => {
  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' });
  const paidAt = new Date();
  const subtotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const { subtotal: sub, taxAmount, grandTotal } = applyTax(subtotal);

  // Process cashback redemptions before closing
  const totalCashRedeemed = await processCashbackRedemptions(cashbackRedemptions);
  const effectiveTotal = parseFloat(Math.max(0, grandTotal - totalCashRedeemed).toFixed(2));

  // Update orders with cashUsed (attribute per mobile proportionally)
  if (totalCashRedeemed > 0) {
    for (const { mobile, amountToRedeem } of cashbackRedemptions) {
      if (!mobile || !amountToRedeem) continue;
      await Order.updateMany(
        { session: session._id, customerMobile: mobile, paymentStatus: 'UNPAID' },
        { cashUsed: parseFloat(amountToRedeem.toFixed(2)) }
      );
    }
  }

  await Order.updateMany(
    { session: session._id, paymentStatus: 'UNPAID' },
    { paymentStatus: 'PAID', paymentMethod, paidAt }
  );

  session.status = 'CLOSED';
  session.totalAmount = effectiveTotal; // persist effective total (after cashback & tax)
  session.paymentMethod = paymentMethod;
  session.closedAt = paidAt;
  await session.save();

  await Table.findByIdAndUpdate(session.table, { status: 'FREE' });

  // ── Credit cashback AFTER payment ────────────────────────────────────────
  // Cashback is credited post-payment and stamped with today's date.
  // The "next calendar day" rule prevents same-day redemption.
  const creditedAt = new Date();
  for (const order of orders) {
    if (order.customerMobile && order.cashbackAmount > 0 && !order.cashbackCredited) {
      await Customer.findOneAndUpdate(
        { mobile: order.customerMobile },
        { $inc: { cashBalance: order.cashbackAmount }, $set: { cashCreditedAt: creditedAt } },
        { new: true, upsert: true }
      );
      await Order.findByIdAndUpdate(order._id, { cashbackCredited: true });
      console.log(`💰 Cashback ₹${order.cashbackAmount} credited to ${order.customerMobile} (available from tomorrow)`);
    }
  }

  return { subtotal: sub, taxAmount, grandTotal, totalCashRedeemed, effectiveTotal, paidAt };
};

// ── Date helpers ──────────────────────────────────────────────────────────
// Returns true if the given date is today (same calendar date in local time)
const isToday = (date) => {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

// ── Build per-mobile cashback info from session orders ────────────────────
// redeemableBalance: the portion the customer can actually use RIGHT NOW.
// If cashback was last credited today, the entire balance is locked until
// tomorrow — enforcing the "next calendar day" rule.
const getCustomerCashbacks = async (orders) => {
  const mobiles = [...new Set(orders
    .filter((o) => o.customerMobile && o.paymentStatus === 'UNPAID')
    .map((o) => o.customerMobile))];

  const cashbacks = await Promise.all(
    mobiles.map(async (mobile) => {
      const customer = await Customer.findOne({ mobile }).lean();
      const cashBalance = customer ? customer.cashBalance : 0;
      const creditedToday = isToday(customer?.cashCreditedAt);
      // If credited today, lock the entire balance — only available from tomorrow
      const redeemableBalance = creditedToday ? 0 : cashBalance;
      const orderTotal = orders
        .filter((o) => o.customerMobile === mobile && o.paymentStatus === 'UNPAID')
        .reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        mobile,
        cashBalance,
        redeemableBalance,
        lockedUntilTomorrow: creditedToday && cashBalance > 0,
        orderTotal: parseFloat(orderTotal.toFixed(2)),
      };
    })
  );
  return cashbacks;
};

// ── GET /api/cashier/tables ────────────────────────────────────────────────

const getTableBills = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ status: 'ACTIVE' })
    .populate('table', 'tableNumber floor')
    .lean();

  const bills = await Promise.all(
    sessions.map(async (session) => {
      const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' }).lean();
      const subtotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const { subtotal: sub, taxAmount, grandTotal } = applyTax(subtotal);
      return {
        sessionId: session._id,
        tableId: session.table._id,
        tableNumber: session.table.tableNumber,
        totalOrders: orders.length,
        subtotal: sub,
        taxAmount,
        grandTotal,
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
    .select('customerName customerMobile status paymentStatus items totalAmount cashbackAmount cashbackCredited cashUsed createdAt')
    .lean();

  const unpaidOrders = orders.filter((o) => o.paymentStatus === 'UNPAID');
  const subtotal = unpaidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const { subtotal: sub, taxAmount, grandTotal } = applyTax(subtotal);

  // Per-mobile cashback info
  const customerCashbacks = await getCustomerCashbacks(orders);

  res.status(200).json({
    success: true,
    data: { session, orders, subtotal: sub, taxAmount, grandTotal, customerCashbacks },
  });
});

// ── GET /api/cashier/session/:sessionId/upi ───────────────────────────────

const generateUpiQr = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.sessionId).lean();
  if (!session) { res.status(404); throw new Error('Session not found'); }
  if (session.status === 'CLOSED') { res.status(409); throw new Error('Session is already closed'); }

  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' }).lean();
  const subtotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const { subtotal: sub, taxAmount, grandTotal } = applyTax(subtotal);

  if (grandTotal === 0) { res.status(409); throw new Error('No unpaid amount for this session'); }

  const owner = await User.findOne({ role: 'OWNER', upiId: { $ne: null } }).lean();
  if (!owner?.upiId) {
    res.status(404);
    throw new Error('Owner UPI ID not configured. Ask the owner to set it up in their panel.');
  }

  const upiUrl = `upi://pay?pa=${encodeURIComponent(owner.upiId)}&pn=Restaurant&am=${grandTotal}&cu=INR`;
  res.status(200).json({ success: true, data: { upiUrl, amount: grandTotal, subtotal: sub, taxAmount, upiId: owner.upiId } });
});

// ── GET /api/cashier/session/:sessionId/razorpay-order ────────────────────

const createRazorpayOrder = asyncHandler(async (req, res) => {
  const session = await getValidSession(req.params.sessionId, res);

  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' }).lean();
  if (orders.length === 0) { res.status(409); throw new Error('No unpaid orders for this session'); }

  const unprepared = orders.filter((o) => o.status !== 'PREPARED');
  if (unprepared.length > 0) {
    res.status(409);
    throw new Error(`${unprepared.length} order(s) not yet prepared by kitchen`);
  }

  const subtotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const { grandTotal } = applyTax(subtotal);
  const amountInPaise = Math.round(grandTotal * 100);

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

const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cashbackRedemptions } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required');
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error('Payment signature verification failed');
  }

  const session = await getValidSession(req.params.sessionId, res);
  const { grandTotal, totalCashRedeemed, effectiveTotal, paidAt } = await closeSession(session, 'CARD', cashbackRedemptions || []);

  res.status(200).json({
    success: true,
    data: {
      message: 'Razorpay card payment verified and session closed',
      totalPaid: effectiveTotal,
      cashbackApplied: totalCashRedeemed,
      paymentMethod: 'CARD',
      razorpayPaymentId: razorpay_payment_id,
      paidAt,
    },
  });
});

// ── PATCH /api/cashier/session/:sessionId/pay ─────────────────────────────

const processPayment = asyncHandler(async (req, res) => {
  const { paymentMethod, cashbackRedemptions } = req.body;

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

  // UPI — return QR data, do NOT close session yet (cashback applied on confirm)
  if (paymentMethod === 'UPI') {
    const owner = await User.findOne({ role: 'OWNER', upiId: { $ne: null } }).lean();
    if (!owner?.upiId) { res.status(404); throw new Error('Owner UPI ID not configured.'); }
    const subtotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const { subtotal: sub, taxAmount, grandTotal } = applyTax(subtotal);

    // Calculate effective amount after cashback
    const cashRedeemable = (cashbackRedemptions || []).reduce((s, r) => s + (r.amountToRedeem || 0), 0);
    const effectiveAmount = parseFloat(Math.max(0, grandTotal - cashRedeemable).toFixed(2));

    const upiUrl = `upi://pay?pa=${encodeURIComponent(owner.upiId)}&pn=Restaurant&am=${effectiveAmount}&cu=INR`;
    return res.status(200).json({
      success: true,
      data: { message: 'Scan QR and confirm after payment', upiUrl, amount: effectiveAmount, subtotal: sub, taxAmount, grandTotal, sessionId: session._id },
    });
  }

  // CASH — close immediately
  const { grandTotal, totalCashRedeemed, effectiveTotal, paidAt } = await closeSession(session, paymentMethod, cashbackRedemptions || []);
  res.status(200).json({
    success: true,
    data: { message: 'Payment processed', totalPaid: effectiveTotal, cashbackApplied: totalCashRedeemed, paymentMethod, paidAt },
  });
});

// ── PATCH /api/cashier/session/:sessionId/confirm-payment ─────────────────

const confirmPayment = asyncHandler(async (req, res) => {
  const { cashbackRedemptions } = req.body;
  const session = await getValidSession(req.params.sessionId, res);

  const orders = await Order.find({ session: session._id, paymentStatus: 'UNPAID' });
  if (orders.length === 0) { res.status(409); throw new Error('No unpaid orders to confirm'); }

  const { grandTotal, totalCashRedeemed, effectiveTotal, paidAt } = await closeSession(session, 'UPI', cashbackRedemptions || []);

  res.status(200).json({
    success: true,
    data: { message: 'UPI payment confirmed. Session closed.', totalPaid: effectiveTotal, cashbackApplied: totalCashRedeemed, paidAt },
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
