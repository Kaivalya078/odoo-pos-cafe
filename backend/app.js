const express = require('express');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');

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

// 404 + error handlers (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
