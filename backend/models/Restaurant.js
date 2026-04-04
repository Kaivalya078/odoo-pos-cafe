const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED'],
      default: 'CLOSED',
    },
    openingHour: { type: Number, default: 9, min: 0, max: 23 },
    closingHour: { type: Number, default: 22, min: 1, max: 24 },
    lastOpenedAt: { type: Date, default: null },
    lastClosedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
