import api from './api';

export const getTables = () => api.get('/cashier/tables');

export const getSession = (sessionId) => api.get(`/cashier/session/${sessionId}`);

export const getUpiQr = (sessionId) => api.get(`/cashier/session/${sessionId}/upi`);

export const getRazorpayOrder = (sessionId) =>
  api.get(`/cashier/session/${sessionId}/razorpay-order`);

// cashbackRedemptions: [{ mobile, amountToRedeem }] — optional
export const verifyRazorpayPayment = (sessionId, payload) =>
  api.post(`/cashier/session/${sessionId}/verify-razorpay`, payload);

// cashbackRedemptions: [{ mobile, amountToRedeem }] — optional
export const paySession = (sessionId, paymentMethod, cashbackRedemptions = []) =>
  api.patch(`/cashier/session/${sessionId}/pay`, { paymentMethod, cashbackRedemptions });

// cashbackRedemptions: [{ mobile, amountToRedeem }] — optional
export const confirmPayment = (sessionId, cashbackRedemptions = []) =>
  api.patch(`/cashier/session/${sessionId}/confirm-payment`, { cashbackRedemptions });
