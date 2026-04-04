import api from './api';

// GET /api/bookings/availability?date=YYYY-MM-DD (Public)
export const getAvailability = (date) =>
  api.get('/bookings/availability', { params: { date } });

// POST /api/bookings (Public)
export const createBooking = (data) =>
  api.post('/bookings', data);

// GET /api/bookings (OWNER, ADMIN)
export const getBookings = () =>
  api.get('/bookings');

// PATCH /api/bookings/:id/cancel (OWNER, ADMIN)
export const cancelBooking = (id) =>
  api.patch(`/bookings/${id}/cancel`);

// PATCH /api/bookings/:id/complete (OWNER, ADMIN)
export const completeBooking = (id) =>
  api.patch(`/bookings/${id}/complete`);
