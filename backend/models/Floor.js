const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Floor name is required'],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Floor', floorSchema);
