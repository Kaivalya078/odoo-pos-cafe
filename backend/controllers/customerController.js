const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const { sendOtp } = require('../utils/smsService');

// ── POST /api/customer/otp/request ──────────────────────────────────────────
// Accepts { mobile } — upserts Customer, generates OTP, returns it in response
// (For production: swap the return with an SMS send)
const requestOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  if (!mobile || !/^\d{10}$/.test(mobile)) {
    res.status(400);
    throw new Error('A valid 10-digit mobile number is required');
  }

  // Find or create customer record
  let customer = await Customer.findOne({ mobile });
  if (!customer) {
    customer = new Customer({ mobile });
  }

  const otp = customer.setOtp();
  await customer.save();

  // Send OTP via Twilio SMS (falls back to console log in dev mode)
  await sendOtp(mobile, otp);

  res.status(200).json({
    success: true,
    message: `OTP sent to ${mobile}`,
    // Hide OTP from response when real SMS is active (Twilio keys are set).
    // Show it only when no keys are configured, for easy dev/testing.
    ...(!process.env.TWILIO_ACCOUNT_SID && { otp }),
  });
});

// ── POST /api/customer/otp/verify ────────────────────────────────────────────
// Accepts { mobile, otp } — verifies OTP, returns cashBalance
const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    res.status(400);
    throw new Error('mobile and otp are required');
  }

  const customer = await Customer.findOne({ mobile });
  if (!customer) {
    res.status(404);
    throw new Error('No account found for this mobile number');
  }

  if (!customer.verifyOtp(String(otp))) {
    res.status(401);
    throw new Error('Invalid or expired OTP');
  }

  customer.clearOtp();
  await customer.save();

  res.status(200).json({
    success: true,
    verified: true,
    mobile,
    cashBalance: customer.cashBalance,
  });
});

// ── GET /api/customer/cash-check?mobile=XXXXXXXXXX ───────────────────────────
// Public — returns cashBalance + redemption eligibility for a mobile number
const checkCash = asyncHandler(async (req, res) => {
  const { mobile } = req.query;

  if (!mobile || !/^\d{10}$/.test(mobile)) {
    res.status(400);
    throw new Error('A valid 10-digit mobile number is required');
  }

  const customer = await Customer.findOne({ mobile }).lean();

  // Calendar-day lock: balance credited today cannot be redeemed until tomorrow
  const cashBalance = customer ? customer.cashBalance : 0;
  const cashCreditedAt = customer?.cashCreditedAt || null;
  const creditedToday = cashCreditedAt
    ? (() => {
        const d = new Date(cashCreditedAt);
        const now = new Date();
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      })()
    : false;
  const lockedUntilTomorrow = creditedToday && cashBalance > 0;
  const redeemableBalance = lockedUntilTomorrow ? 0 : cashBalance;

  res.status(200).json({
    success: true,
    mobile,
    cashBalance,
    redeemableBalance,
    lockedUntilTomorrow,
    exists: !!customer,
  });
});

// ── PATCH /api/customer/apply-cashback ──────────────────────────────────────
// Internal helper called by cashier payment flow
// Accepts { mobile, amountToRedeem } — deducts from cashBalance safely
const applyCashback = asyncHandler(async (req, res) => {
  const { mobile, amountToRedeem } = req.body;

  if (!mobile || amountToRedeem == null || amountToRedeem <= 0) {
    res.status(400);
    throw new Error('mobile and a positive amountToRedeem are required');
  }

  const customer = await Customer.findOne({ mobile });
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  // Cap deduction at available balance
  const actualDeduction = Math.min(amountToRedeem, customer.cashBalance);
  customer.cashBalance = parseFloat((customer.cashBalance - actualDeduction).toFixed(2));
  await customer.save();

  res.status(200).json({
    success: true,
    mobile,
    deducted: actualDeduction,
    newBalance: customer.cashBalance,
  });
});

// ── Helper (used internally by cashierController, not a route) ───────────────
// Deducts cashback from a customer without going through HTTP — used server-side
const deductCashback = async (mobile, amountToRedeem) => {
  const customer = await Customer.findOne({ mobile });
  if (!customer) return 0;
  const actualDeduction = Math.min(amountToRedeem, customer.cashBalance);
  customer.cashBalance = parseFloat((customer.cashBalance - actualDeduction).toFixed(2));
  await customer.save();
  return actualDeduction;
};

module.exports = { requestOtp, verifyOtp, checkCash, applyCashback, deductCashback };
