import api from './api';

export const getSummary = (startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return api.get('/admin/reports/summary', { params });
};

export const getOrderHistory = (params = {}) =>
  api.get('/admin/orders/history', { params });

export const getSessionHistory = () =>
  api.get('/admin/sessions/history');

export const getTopProducts = () =>
  api.get('/admin/reports/top-products');

export const getCategoryRevenue = () =>
  api.get('/admin/reports/category-revenue');

export const getPaymentBreakdown = () =>
  api.get('/admin/reports/payment-breakdown');

export const getHourlyRevenue = () =>
  api.get('/admin/reports/hourly-revenue');

export const getInsights = () =>
  api.get('/admin/reports/insights');

