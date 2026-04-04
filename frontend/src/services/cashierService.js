import api from './api';

// GET /api/cashier/tables — all active sessions (occupied tables)
export const getTables = () => api.get('/cashier/tables');

// GET /api/cashier/session/:sessionId — session details + orders
export const getSession = (sessionId) => api.get(`/cashier/session/${sessionId}`);

// GET /api/cashier/session/:sessionId/upi — generate UPI QR URL
export const getUpi = (sessionId) => api.get(`/cashier/session/${sessionId}/upi`);

// PATCH /api/cashier/session/:sessionId/pay — process payment (CASH/CARD/UPI)
export const paySession = (sessionId, paymentMethod) =>
  api.patch(`/cashier/session/${sessionId}/pay`, { paymentMethod });

// PATCH /api/cashier/session/:sessionId/confirm-payment — confirm UPI payment
export const confirmPayment = (sessionId) =>
  api.patch(`/cashier/session/${sessionId}/confirm-payment`);
