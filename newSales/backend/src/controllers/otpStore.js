// controllers/otpStore.js
// Simple in-memory OTP store with expiry. Replace with Redis in production.

const store = new Map(); // key -> { otp, expiresAt, type }

function setOtp(key, otp, ttlSeconds = 600, type = "generic") {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  store.set(key, { otp, expiresAt, type });

  // auto cleanup after expiry
  setTimeout(() => {
    const cur = store.get(key);
    if (cur && cur.expiresAt <= Date.now()) store.delete(key);
  }, ttlSeconds * 1000 + 2000);
}

function getOtpRecord(key) {
  const rec = store.get(key);
  if (!rec) return null;
  if (rec.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return rec;
}

function clearOtp(key) {
  store.delete(key);
}

module.exports = { setOtp, getOtpRecord, clearOtp };
