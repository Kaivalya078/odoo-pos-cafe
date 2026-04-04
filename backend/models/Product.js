const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Variant name is required'], trim: true },
    price: { type: Number, required: [true, 'Variant price is required'], min: [0, 'Price must be positive'] },
  },
  { _id: false }
);

const addonSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Add-on name is required'], trim: true },
    price: { type: Number, required: [true, 'Add-on price is required'], min: [0, 'Price must be positive'] },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    image: {
      type: String,
      default: 'https://via.placeholder.com/150',
    },
    availability: {
      type: String,
      enum: ['AVAILABLE', 'UNAVAILABLE'],
      default: 'AVAILABLE',
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    addons: {
      type: [addonSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
