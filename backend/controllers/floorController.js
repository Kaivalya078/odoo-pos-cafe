const asyncHandler = require('../utils/asyncHandler');
const Floor = require('../models/Floor');

// @route   POST /api/floors
// @access  Private (OWNER, ADMIN)
const createFloor = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Floor name is required');
  }

  const existing = await Floor.findOne({ name: name.trim() });
  if (existing) {
    res.status(409);
    throw new Error('A floor with that name already exists');
  }

  const floor = await Floor.create({ name });
  res.status(201).json({ success: true, data: floor });
});

// @route   GET /api/floors
// @access  Private (OWNER, ADMIN)
const getAllFloors = asyncHandler(async (req, res) => {
  const floors = await Floor.find().sort({ createdAt: 1 }).lean();
  res.status(200).json({ success: true, data: floors });
});

module.exports = { createFloor, getAllFloors };
