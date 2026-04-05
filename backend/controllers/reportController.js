const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Session = require('../models/Session');

// @route   GET /api/admin/orders/history
// @access  Private (OWNER, ADMIN)
const getOrderHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, tableId } = req.query;

  const filter = { paymentStatus: 'PAID' };

  if (tableId) filter.table = tableId;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const orders = await Order.find(filter)
    .populate('table', 'tableNumber')
    .select('customerName items totalAmount paymentMethod createdAt table')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: orders });
});

// @route   GET /api/admin/sessions/history
// @access  Private (OWNER, ADMIN)
const getSessionHistory = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ status: 'CLOSED' })
    .populate('table', 'tableNumber')
    .sort({ closedAt: -1 })
    .lean();

  const data = await Promise.all(
    sessions.map(async (session) => {
      const orders = await Order.find({ session: session._id }).lean();
      const totalAmount = parseFloat(
        orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)
      );
      return {
        sessionId: session._id,
        tableNumber: session.table?.tableNumber,
        totalOrders: orders.length,
        totalAmount,
        paymentMethod: session.paymentMethod,
        createdAt: session.createdAt,
        closedAt: session.closedAt,
      };
    })
  );

  res.status(200).json({ success: true, data });
});

// @route   GET /api/admin/reports/summary
// @access  Private (OWNER, ADMIN)
const getRevenueSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const match = { paymentStatus: 'PAID' };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match.createdAt.$lte = end;
    }
  }

  const [result] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
        totalSessions: { $addToSet: '$session' },
      },
    },
    {
      $project: {
        _id: 0,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        totalOrders: 1,
        totalSessions: { $size: '$totalSessions' },
        avgOrderValue: {
          $round: [{ $divide: ['$totalRevenue', '$totalOrders'] }, 2],
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: result || { totalRevenue: 0, totalOrders: 0, totalSessions: 0, avgOrderValue: 0 },
  });
});

// @route   GET /api/admin/reports/top-products
// @access  Private (OWNER, ADMIN)
const getTopProducts = asyncHandler(async (req, res) => {
  const topProducts = await Order.aggregate([
    { $match: { paymentStatus: 'PAID' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.itemTotal' },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        productName: '$_id',
        totalQuantity: 1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
      },
    },
  ]);

  res.status(200).json({ success: true, data: topProducts });
});


// @route   GET /api/admin/reports/category-revenue
// @access  Private (OWNER, ADMIN)
const getCategoryRevenue = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $match: { paymentStatus: 'PAID' } },
    { $unwind: '$items' },
    // Match by item name since product IDs in old orders may not match current product collection
    {
      $lookup: {
        from: 'products',
        let: { iname: { $toLower: '$items.name' } },
        pipeline: [
          { $match: { $expr: { $eq: [{ $toLower: '$name' }, '$$iname'] } } },
          { $project: { _id: 0, category: 1 } },
        ],
        as: 'productInfo',
      },
    },
    {
      $group: {
        _id: {
          $ifNull: [
            { $arrayElemAt: ['$productInfo.category', 0] },
            'Uncategorised',
          ],
        },
        revenue: { $sum: '$items.itemTotal' },
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        revenue: { $round: ['$revenue', 2] },
      },
    },
    { $sort: { revenue: -1 } },
  ]);
  res.status(200).json({ success: true, data });
});


// @route   GET /api/admin/reports/payment-breakdown
// @access  Private (OWNER)
const getPaymentBreakdown = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $match: { paymentStatus: 'PAID' } },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
    { $project: { _id: 0, method: '$_id', count: 1 } },
    { $sort: { count: -1 } },
  ]);
  res.status(200).json({ success: true, data });
});

// @route   GET /api/admin/reports/hourly-revenue
// @access  Private (OWNER)
const getHourlyRevenue = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $match: { paymentStatus: 'PAID' } },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        revenue: { $sum: '$totalAmount' },
      },
    },
    { $project: { _id: 0, hour: '$_id', revenue: { $round: ['$revenue', 2] } } },
    { $sort: { hour: 1 } },
  ]);
  res.status(200).json({ success: true, data });
});

// @route   GET /api/admin/reports/insights
// @access  Private (OWNER)
const getInsights = asyncHandler(async (req, res) => {
  const [hourlyRaw, topRaw] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: { $hour: '$createdAt' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 1 },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.quantity' } } },
      { $sort: { qty: -1 } },
      { $limit: 1 },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      bestHour: hourlyRaw[0]?._id ?? null,
      bestProduct: topRaw[0]?._id ?? null,
    },
  });
});

module.exports = {
  getOrderHistory,
  getSessionHistory,
  getRevenueSummary,
  getTopProducts,
  getCategoryRevenue,
  getPaymentBreakdown,
  getHourlyRevenue,
  getInsights,
};

