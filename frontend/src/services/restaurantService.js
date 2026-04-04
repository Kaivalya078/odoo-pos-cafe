import api from './api';

// GET /api/restaurant/status
// Response: { status }  (status is 'OPEN' or 'CLOSED')
export const getRestaurantStatus = () => api.get('/restaurant/status');

// PATCH /api/restaurant/toggle
// Response: { message, status }
export const toggleRestaurantStatus = () => api.patch('/restaurant/toggle');
