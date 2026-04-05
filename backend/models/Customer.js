const mongoose = require('mongoose');
const crypto = require('crypto');

const customerSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: [/^\d{10}$/, 'Mobile must be exactly 10 digits'],
    },
    cashBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Tracks the date cashback was last credited — used to enforce the
    // "next calendar day" rule: cashback earned today cannot be redeemed today.
    cashCreditedAt: { type: Date, default: null },
    // OTP fields (cleared after successful verification)
    otpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Generate a 6-digit OTP, store its SHA-256 hash, return plain OTP
customerSchema.methods.setOtp = function () {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  this.otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  this.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

customerSchema.methods.verifyOtp = function (otp) {
  if (!this.otpHash || !this.otpExpiresAt) return false;
  if (this.otpExpiresAt < new Date()) return false;
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  return hash === this.otpHash;
};

customerSchema.methods.clearOtp = function () {
  this.otpHash = null;
  this.otpExpiresAt = null;
};

module.exports = mongoose.model('Customer', customerSchema);
