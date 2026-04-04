import api from './api';

// GET /api/restaurant/status
// Response: { status }  (status is 'OPEN' or 'CLOSED')
export const getRestaurantStatus = () => api.get('/restaurant/status');

// PATCH /api/restaurant/toggle
// Response: { message, status }
export const toggleRestaurantStatus = () => api.patch('/restaurant/toggle');

// PATCH /api/restaurant/hours
// Body: { openingHour, closingHour }
export const updateHours = (openingHour, closingHour) =>
  api.patch('/restaurant/hours', { openingHour, closingHour });
