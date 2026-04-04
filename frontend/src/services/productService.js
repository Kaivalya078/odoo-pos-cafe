import api from './api';
import axios from 'axios';

// ── OWNER / ADMIN endpoints ──────────────────────────────────────────────────

// GET /api/products
// Response: { success, data: [Product] }
export const getAllProducts = () => api.get('/products');

// POST /api/products
// Body: { name, description, category, image, variants, addons }
// Response: { success, data: Product }
export const createProduct = (data) => api.post('/products', data);

// PUT /api/products/:id
// Body: any Product fields
// Response: { success, data: Product }
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);

// DELETE /api/products/:id
// Response: { success, data: { message } }
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ── KITCHEN endpoints ────────────────────────────────────────────────────────

// GET /api/products/kitchen
// Response: { success, data: [Product] }
export const getKitchenProducts = () => api.get('/products/kitchen');

// PATCH /api/products/:id/availability
// Response: { success, data: { id, name, availability } }
export const toggleAvailability = (id) => api.patch(`/products/${id}/availability`);

// ── PUBLIC endpoint (no auth) ────────────────────────────────────────────────

// GET /api/menu
// Response: { success, data: { [category]: [Product] } }
export const getPublicMenu = () => axios.get('/api/menu');
