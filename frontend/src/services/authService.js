import api from './api';

// POST /api/auth/login
// Body: { email, password }
// Response: { token, user: { id, name, role } }
export const login = (email, password) =>
  api.post('/auth/login', { email, password });
