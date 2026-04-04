const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const userRoutes = require('./routes/userRoutes');
const floorRoutes = require('./routes/floorRoutes');
const tableRoutes = require('./routes/tableRoutes');
const productRoutes = require('./routes/productRoutes');
const { getMenu } = require('./controllers/productController');
const orderRoutes = require('./routes/orderRoutes');
const kitchenRoutes = require('./routes/kitchenRoutes');
const cashierRoutes = require('./routes/cashierRoutes');
const reportRoutes = require('./routes/reportRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// CORS — allow all origins (required for LAN / mobile access)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/products', productRoutes);
app.get('/api/menu', getMenu); // public — no router-level auth middleware
app.use('/api/orders', orderRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/admin', reportRoutes);
app.use('/api/bookings', bookingRoutes);

// 404 + error handlers (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
