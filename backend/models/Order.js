const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    variant: {
      name: { type: String, default: '' },
      price: { type: Number, default: 0 },
    },
    addons: [
      {
        name: { type: String },
        price: { type: Number, default: 0 },
        _id: false,
      },
    ],
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    itemTotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Table is required'],
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      validate: [(arr) => arr.length > 0, 'Order must have at least one item'],
    },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PLACED', 'APPROVED', 'REJECTED'],
      default: 'PLACED',
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PAID'],
      default: 'UNPAID',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
