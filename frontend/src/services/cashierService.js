import api from './api';

export const getTables = () => api.get('/cashier/tables');

export const getSession = (sessionId) => api.get(`/cashier/session/${sessionId}`);

export const getUpiQr = (sessionId) => api.get(`/cashier/session/${sessionId}/upi`);

export const getRazorpayOrder = (sessionId) =>
  api.get(`/cashier/session/${sessionId}/razorpay-order`);

export const verifyRazorpayPayment = (sessionId, payload) =>
  api.post(`/cashier/session/${sessionId}/verify-razorpay`, payload);

export const paySession = (sessionId, paymentMethod) =>
  api.patch(`/cashier/session/${sessionId}/pay`, { paymentMethod });

export const confirmPayment = (sessionId) =>
  api.patch(`/cashier/session/${sessionId}/confirm-payment`);
