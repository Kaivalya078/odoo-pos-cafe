import api from './api';

// GET /api/floors
// Response: { success, data: [{ _id, name, createdAt, updatedAt }] }
export const getAllFloors = () => api.get('/floors');

// POST /api/floors
// Body: { name }
// Response: { success, data: { _id, name, createdAt, updatedAt } }
export const createFloor = (data) => api.post('/floors', data);
