import api from './api';

// GET /api/users
// Response: { success, data: [{ _id, name, email, role, createdAt, updatedAt }] }
export const getAllUsers = () => api.get('/users');

// POST /api/users
// Body: { name, email, password, role }
// Response: { success, data: { id, name, email, role } }
export const createUser = (data) => api.post('/users', data);

// PATCH /api/users/:id/role
// Body: { role }
// Response: { success, data: user }
export const updateUserRole = (id, role) =>
  api.patch(`/users/${id}/role`, { role });

// GET /api/users/dashboard
// Response: { success, data: { totalUsers, byRole, restaurant: { status } } }
export const getOwnerDashboard = () => api.get('/users/dashboard');
