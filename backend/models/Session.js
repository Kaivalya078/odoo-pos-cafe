const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CLOSED'],
      default: 'ACTIVE',
    },
    totalAmount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD'],
      default: null,
    },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
