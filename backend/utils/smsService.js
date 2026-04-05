/**
 * smsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Isolated SMS helper using Twilio.
 *
 * Behaviour:
 *  • If TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are set
 *    AND NODE_ENV !== 'development'  →  sends a real SMS via Twilio
 *  • Otherwise (dev mode or missing keys)  →  logs OTP to console only
 *
 * This keeps the rest of the codebase provider-agnostic. Swap to MSG91 or
 * any other provider by editing only this file.
 */

// SMS is active whenever all 3 Twilio keys are present in the environment.
// We intentionally do NOT gate this on NODE_ENV — this POS runs locally in
// "development" mode but is always used in real production conditions.
const SMS_ENABLED =
  !!(process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_FROM_NUMBER);

// Lazy-init Twilio client so the server boots fine even without keys
let twilioClient = null;
const getClient = () => {
  if (!twilioClient) {
    const twilio = require('twilio');
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
};

/**
 * sendOtp(mobile, otp)
 * ─────────────────────
 * @param {string} mobile  10-digit Indian mobile number (no country code prefix)
 * @param {string} otp     6-digit OTP string
 * @returns {Promise<void>}
 */
const sendOtp = async (mobile, otp) => {
  const to = `+91${mobile}`; // Prepend India country code
  const body = `Your POS Cafe OTP is: ${otp}. Valid for 10 minutes. Do not share this with anyone.`;

  if (!SMS_ENABLED) {
    // Dev / no-keys fallback — print to console
    console.log(`\n📱 [SMS not sent — dev mode] OTP for ${to}: ${otp}  (expires in 10 min)\n`);
    return;
  }

  try {
    const client = getClient();
    await client.messages.create({
      body,
      from: process.env.TWILIO_FROM_NUMBER,
      to,
    });
    console.log(`📤 OTP SMS sent to ${to}`);
  } catch (err) {
    // Log the error but don't crash the request — caller decides how to handle
    console.error(`❌ Failed to send OTP SMS to ${to}:`, err.message);
    throw new Error('Could not send OTP via SMS. Please try again.');
  }
};

module.exports = { sendOtp };
