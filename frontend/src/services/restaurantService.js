import axios from 'axios';
import api from './api';

// GET /api/restaurant/status — PUBLIC, uses plain axios so the 401 interceptor
// never fires for unauthenticated customers on /menu, /order, /tables, /book
export const getRestaurantStatus = () => axios.get('/api/restaurant/status');

// PATCH /api/restaurant/toggle — staff only
export const toggleRestaurantStatus = () => api.patch('/restaurant/toggle');

// PATCH /api/restaurant/hours — staff only
export const updateHours = (openingHour, closingHour) =>
  api.patch('/restaurant/hours', { openingHour, closingHour });

// GET /api/restaurant/last-session — staff only, token-guarded in RestaurantContext
export const getLastSessionSummary = () => api.get('/restaurant/last-session');
