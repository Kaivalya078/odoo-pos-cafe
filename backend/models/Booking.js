const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Table is required'],
    },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },
    startTime: { type: Date, required: [true, 'Start time is required'] },
    endTime: { type: Date, required: [true, 'End time is required'] },
    status: {
      type: String,
      enum: ['BOOKED', 'CANCELLED', 'COMPLETED', 'EXPIRED'],
      default: 'BOOKED',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
