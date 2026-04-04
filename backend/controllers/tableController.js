const asyncHandler = require('../utils/asyncHandler');
const Table = require('../models/Table');
const Floor = require('../models/Floor');

const VALID_STATUSES = ['FREE', 'OCCUPIED', 'RESERVED'];

// @route   POST /api/tables
// @access  Private (OWNER, ADMIN)
const createTable = asyncHandler(async (req, res) => {
  const { tableNumber, floor, seats } = req.body;

  if (!tableNumber || !floor || !seats) {
    res.status(400);
    throw new Error('tableNumber, floor, and seats are all required');
  }

  if (seats < 1) {
    res.status(400);
    throw new Error('Seats must be greater than 0');
  }

  const floorExists = await Floor.findById(floor);
  if (!floorExists) {
    res.status(404);
    throw new Error('Floor not found');
  }

  const duplicate = await Table.findOne({ tableNumber, floor });
  if (duplicate) {
    res.status(409);
    throw new Error(`Table ${tableNumber} already exists on this floor`);
  }

  const table = await Table.create({ tableNumber, floor, seats });
  await table.populate('floor', 'name');

  res.status(201).json({ success: true, data: table });
});

// @route   GET /api/tables
// @access  Private (OWNER, ADMIN)
const getAllTables = asyncHandler(async (req, res) => {
  const tables = await Table.find()
    .populate('floor', 'name')
    .sort({ floor: 1, tableNumber: 1 })
    .lean();
  res.status(200).json({ success: true, data: tables });
});

// @route   GET /api/tables/floor/:floorId
// @access  Private (OWNER, ADMIN)
const getTablesByFloor = asyncHandler(async (req, res) => {
  const floorExists = await Floor.findById(req.params.floorId);
  if (!floorExists) {
    res.status(404);
    throw new Error('Floor not found');
  }

  const tables = await Table.find({ floor: req.params.floorId })
    .populate('floor', 'name')
    .sort({ tableNumber: 1 })
    .lean();

  res.status(200).json({ success: true, data: tables });
});

// @route   PATCH /api/tables/:id/status
// @access  Private (OWNER, ADMIN)
const updateTableStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const table = await Table.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  ).populate('floor', 'name');

  if (!table) {
    res.status(404);
    throw new Error('Table not found');
  }

  res.status(200).json({ success: true, data: table });
});

// @route   DELETE /api/tables/:id
// @access  Private (OWNER, ADMIN)
const deleteTable = asyncHandler(async (req, res) => {
  const table = await Table.findByIdAndDelete(req.params.id);

  if (!table) {
    res.status(404);
    throw new Error('Table not found');
  }

  res.status(200).json({ success: true, data: { message: 'Table deleted successfully' } });
});

module.exports = { createTable, getAllTables, getTablesByFloor, updateTableStatus, deleteTable };
