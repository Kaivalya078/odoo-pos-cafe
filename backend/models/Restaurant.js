const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED'],
      default: 'CLOSED',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
