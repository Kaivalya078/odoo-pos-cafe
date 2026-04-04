const asyncHandler = require('../utils/asyncHandler');
const Booking = require('../models/Booking');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');

const BOOKING_DURATION_MS = 60 * 60 * 1000;   // 1 hour
const BUFFER_MS = 30 * 60 * 1000;             // 30 minutes
const SLOT_INTERVAL_MS = 30 * 60 * 1000;      // 30-minute slots

// Marks bookings EXPIRED if currentTime > startTime + 15min
const expireStaleBookings = async (tableIds, dateStart, dateEnd) => {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  await Booking.updateMany(
    {
      table: { $in: tableIds },
      status: 'BOOKED',
      startTime: { $gte: dateStart, $lte: dateEnd, $lt: cutoff },
    },
    { status: 'EXPIRED' }
  );
};

// Checks if a candidate [newStart, newEnd] conflicts with any existing booking (including buffer)
const hasConflict = (newStart, newEnd, existingBookings) => {
  const bufferedStart = new Date(newStart.getTime() - BUFFER_MS);
  return existingBookings.some((b) => {
    const bBufferedStart = new Date(b.startTime.getTime() - BUFFER_MS);
    // Two blocked windows overlap if one starts before the other ends
    return bufferedStart < b.endTime && newEnd > bBufferedStart;
  });
};

// @route   GET /api/bookings/availability?date=YYYY-MM-DD
// @access  Public
const getAvailability = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) {
    res.status(400);
    throw new Error('date query param is required (YYYY-MM-DD)');
  }

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const tables = await Table.find().select('tableNumber seats').lean();
  const tableIds = tables.map((t) => t._id);

  await expireStaleBookings(tableIds, dayStart, dayEnd);

  const bookings = await Booking.find({
    table: { $in: tableIds },
    status: 'BOOKED',
    startTime: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  // Read hours from restaurant config
  const config = await Restaurant.findOne().lean();
  const openingHour = config?.openingHour ?? 9;
  const closingHour = config?.closingHour ?? 22;

  // Generate slots for the operating day (in local date context)
  const slots = [];
  const slotBase = new Date(`${date}T00:00:00.000Z`);
  slotBase.setUTCHours(openingHour, 0, 0, 0);

  const slotEnd = new Date(slotBase);
  slotEnd.setUTCHours(closingHour, 0, 0, 0);

  // Last bookable slot must end before closing, so subtract 1hr
  const lastSlot = new Date(slotEnd.getTime() - BOOKING_DURATION_MS);

  for (let t = slotBase.getTime(); t <= lastSlot.getTime(); t += SLOT_INTERVAL_MS) {
    slots.push(new Date(t));
  }

  const availability = tables.map((table) => {
    const tableBookings = bookings.filter(
      (b) => b.table.toString() === table._id.toString()
    );

    return {
      tableId: table._id,
      tableNumber: table.tableNumber,
      seats: table.seats,
      slots: slots.map((slotTime) => {
        const slotEnd = new Date(slotTime.getTime() + BOOKING_DURATION_MS);
        const available = !hasConflict(slotTime, slotEnd, tableBookings);
        return { time: slotTime, available };
      }),
    };
  });

  res.status(200).json({ success: true, data: availability });
});

// @route   POST /api/bookings
// @access  Public
const createBooking = asyncHandler(async (req, res) => {
  const { tableId, name, phone, startTime } = req.body;

  if (!tableId || !name || !phone || !startTime) {
    res.status(400);
    throw new Error('tableId, name, phone, and startTime are required');
  }

  const table = await Table.findById(tableId);
  if (!table) {
    res.status(404);
    throw new Error('Table not found');
  }

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    res.status(400);
    throw new Error('Invalid startTime format');
  }
  if (start < new Date()) {
    res.status(400);
    throw new Error('Cannot book a time slot in the past');
  }

  const end = new Date(start.getTime() + BOOKING_DURATION_MS);

  // Expire stale bookings before conflict check
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);
  await expireStaleBookings([tableId], dayStart, dayEnd);

  // Fetch active bookings for this table on the same day
  const existingBookings = await Booking.find({
    table: tableId,
    status: 'BOOKED',
    startTime: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  if (hasConflict(start, end, existingBookings)) {
    res.status(409);
    throw new Error(
      'This time slot is not available due to an existing booking or the 30-minute buffer rule'
    );
  }

  const booking = await Booking.create({ table: tableId, name, phone, startTime: start, endTime: end });
  await booking.populate('table', 'tableNumber');

  res.status(201).json({ success: true, data: booking });
});

// @route   GET /api/bookings
// @access  Private (OWNER, ADMIN)
const getBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate('table', 'tableNumber floor')
    .sort({ startTime: 1 })
    .lean();
  res.status(200).json({ success: true, data: bookings });
});

// @route   PATCH /api/bookings/:id/cancel
// @access  Private (OWNER, ADMIN)
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.status !== 'BOOKED') {
    res.status(409);
    throw new Error(`Booking is already ${booking.status}`);
  }
  booking.status = 'CANCELLED';
  await booking.save();
  res.status(200).json({ success: true, data: booking });
});

// @route   PATCH /api/bookings/:id/complete
// @access  Private (OWNER, ADMIN)
const completeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.status !== 'BOOKED') {
    res.status(409);
    throw new Error(`Booking is already ${booking.status}`);
  }
  booking.status = 'COMPLETED';
  await booking.save();
  res.status(200).json({ success: true, data: booking });
});

// Exported for use in orderController
const getUpcomingBooking = (tableId) =>
  Booking.findOne({
    table: tableId,
    status: 'BOOKED',
    startTime: { $gte: new Date(), $lte: new Date(Date.now() + BUFFER_MS) },
  }).lean();

module.exports = {
  getAvailability,
  createBooking,
  getBookings,
  cancelBooking,
  completeBooking,
  getUpcomingBooking,
};
