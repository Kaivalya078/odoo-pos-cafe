import axios from 'axios';
import api from './api';

// ── AUTHENTICATED endpoints (requires staff login) ────────────────────────────

// GET /api/tables
// Response: { success, data: [Table] }
export const getAllTablesAuth = () => api.get('/tables');

// ── PUBLIC endpoints (no auth required) ──────────────────────────────────────

// GET /api/menu
// Response: { success, data: { [category]: [Product] } }
// Products returned are AVAILABLE only, grouped by category
export const getPublicMenu = () => axios.get('/api/menu');

// POST /api/orders
// Body: { tableId, customerName, items: [{ product, variant?, addons?, quantity }] }
// Response: { success, data: Order }
export const createOrder = (data) => axios.post('/api/orders', data);
