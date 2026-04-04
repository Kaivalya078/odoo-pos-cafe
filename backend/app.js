const express = require('express');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const userRoutes = require('./routes/userRoutes');
const floorRoutes = require('./routes/floorRoutes');
const tableRoutes = require('./routes/tableRoutes');

const app = express();

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

// 404 + error handlers (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
