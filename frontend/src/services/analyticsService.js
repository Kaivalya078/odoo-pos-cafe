import api from './api';

// GET /api/admin/reports/summary
export const getSummary = (startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return api.get('/admin/reports/summary', { params });
};

// GET /api/admin/orders/history
export const getOrderHistory = (params = {}) =>
  api.get('/admin/orders/history', { params });

// GET /api/admin/sessions/history
export const getSessionHistory = () =>
  api.get('/admin/sessions/history');

// GET /api/admin/reports/top-products
export const getTopProducts = () =>
  api.get('/admin/reports/top-products');
