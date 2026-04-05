const express = require('express');
const { requestOtp, verifyOtp, checkCash, applyCashback } = require('../controllers/customerController');

const router = express.Router();

// All public — no auth middleware needed
router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.get('/cash-check', checkCash);
router.patch('/apply-cashback', applyCashback);

module.exports = router;
