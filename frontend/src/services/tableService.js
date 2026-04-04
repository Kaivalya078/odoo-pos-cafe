import axios from 'axios';
import api from './api';

// GET /api/tables — no auth required (public, for customer table selection)
export const getPublicTables = () => axios.get('/api/tables');

// GET /api/tables — authenticated (for admin/owner)
export const getAllTables = () => api.get('/tables');

// GET /api/tables/floor/:floorId
// Response: { success, data: [{ _id, tableNumber, floor: { _id, name }, seats, status }] }
export const getTablesByFloor = (floorId) => api.get(`/tables/floor/${floorId}`);

// POST /api/tables
// Body: { tableNumber, floor, seats }
// Response: { success, data: { _id, tableNumber, floor: { _id, name }, seats, status } }
export const createTable = (data) => api.post('/tables', data);

// PATCH /api/tables/:id/status
// Body: { status } — 'FREE' | 'OCCUPIED' | 'RESERVED'
// Response: { success, data: table }
export const updateTableStatus = (id, status) =>
  api.patch(`/tables/${id}/status`, { status });

// DELETE /api/tables/:id
// Response: { success, data: { message } }
export const deleteTable = (id) => api.delete(`/tables/${id}`);
