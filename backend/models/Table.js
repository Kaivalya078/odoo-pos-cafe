const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: Number,
      required: [true, 'Table number is required'],
    },
    floor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Floor',
      required: [true, 'Floor is required'],
    },
    seats: {
      type: Number,
      required: [true, 'Seat count is required'],
      min: [1, 'Seats must be greater than 0'],
    },
    status: {
      type: String,
      enum: ['FREE', 'OCCUPIED', 'RESERVED'],
      default: 'FREE',
    },
  },
  { timestamps: true }
);

// Unique tableNumber per floor
tableSchema.index({ tableNumber: 1, floor: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);
