import axios from 'axios';
import api from './api';

// ── PUBLIC endpoints (no auth required) ──────────────────────────────────────

// GET /api/menu — available products grouped by category
export const getPublicMenu = () => axios.get('/api/menu');

// POST /api/orders — customer places an order
// Body: { tableId, customerName, items: [{ product, variant?, addons?, quantity }] }
export const createOrder = (data) => axios.post('/api/orders', data);

// ── AUTHENTICATED endpoints (requires staff login) ────────────────────────────

// GET /api/orders/pending — all PLACED orders awaiting approval
export const getPendingOrders = () => api.get('/orders/pending');

// PATCH /api/orders/:id/approve — approve and mark table OCCUPIED
export const approveOrder = (id) => api.patch(`/orders/${id}/approve`);

// PATCH /api/orders/:id/reject — reject, table stays FREE
export const rejectOrder = (id) => api.patch(`/orders/${id}/reject`);

