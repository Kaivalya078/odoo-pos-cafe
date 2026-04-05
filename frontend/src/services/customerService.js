import axios from 'axios';

// ── CUSTOMER / LOYALTY endpoints (all public — no auth) ──────────────────────

// POST /api/customer/otp/request
// Body: { mobile }
// Response: { success, message, otp } — otp returned in dev mode
export const requestOtp = (mobile) =>
  axios.post('/api/customer/otp/request', { mobile });

// POST /api/customer/otp/verify
// Body: { mobile, otp }
// Response: { success, verified, mobile, cashBalance }
export const verifyOtp = (mobile, otp) =>
  axios.post('/api/customer/otp/verify', { mobile, otp });

// GET /api/customer/cash-check?mobile=XXXXXXXXXX
// Response: { success, mobile, cashBalance, exists }
export const checkCash = (mobile) =>
  axios.get(`/api/customer/cash-check?mobile=${mobile}`);
