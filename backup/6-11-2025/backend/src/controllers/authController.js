// backend/src/controllers/authController.js
/**
 * Auth controller with extended forgot flow:
 * - forgotRequest      : send OTP
 * - forgotVerifyOtp    : verify OTP only (phase 2)
 * - forgotReset        : verify OTP + update password in DB + send confirmation email
 *
 * Other endpoints (register/login) kept as before.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const {
  sendOtpEmail,
  sendMail, // generic mail
} = require("../utils/email");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 600);
const LOGIN_OTP_BYPASS_EMAIL = (process.env.LOGIN_OTP_BYPASS_EMAIL || "avinash@gmail.com").toLowerCase();

// simple in-memory OTP store
const otpStore = new Map();

function setOtp(key, otp, ttl = OTP_TTL_SECONDS, purpose = "generic") {
  const expiresAt = Date.now() + ttl * 1000;
  otpStore.set(key, { otp: String(otp), expiresAt, purpose });
  setTimeout(() => {
    const cur = otpStore.get(key);
    if (cur && cur.expiresAt <= Date.now()) otpStore.delete(key);
  }, ttl * 1000 + 2000);
}

function getOtpRecord(key) {
  const rec = otpStore.get(key);
  if (!rec) return null;
  if (rec.expiresAt <= Date.now()) {
    otpStore.delete(key);
    return null;
  }
  return rec;
}

function clearOtp(key) {
  otpStore.delete(key);
}

function genOtp(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

// --------------------
// Register & Login (unchanged / reused)
// --------------------
exports.registerRequest = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });
  try {
    const otp = genOtp(6);
    setOtp(`register:${email}`, otp, OTP_TTL_SECONDS, "register");
    await sendOtpEmail(email, otp);
    return res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("registerRequest error:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.registerVerify = async (req, res) => {
  const { email, otp, name, password } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Missing required fields" });

  try {
    const rec = getOtpRecord(`register:${email}`);
    if (!rec || rec.otp !== String(otp)) return res.status(400).json({ message: "Invalid or expired OTP" });

    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length) {
      const user = existing[0];
      const token = sign(user);
      clearOtp(`register:${email}`);
      return res.json({ token, user });
    }

    // Use provided password if present, otherwise fall back to random password
    const suppliedPassword = (password && String(password).trim().length > 0) ? String(password) : Math.random().toString(36).slice(2);
    const hash = await bcrypt.hash(suppliedPassword, 10);

    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, password, role) VALUES (?, ?, ?, ?, ?)",
      [name || "", email, hash, suppliedPassword, "user"]
    );

    const user = { id: result.insertId, email, name: name || "", role: "user" };
    const token = sign(user);

    // Clear OTP now that registration succeeded
    clearOtp(`register:${email}`);

    // Send welcome email with credentials (non-blocking)
    try {
      const subject = "Welcome to SalesDream — your account details";
      const html = `
        <h2>Welcome to SalesDream</h2>
        <p>Hi ${name || "there"},</p>
        <p>Your account was created successfully. Here are your sign-in details:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> ${suppliedPassword}</li>
        </ul>
        <p>For security, please change your password after first login.</p>
        <p>If you did not sign up for SalesDream, please contact support immediately.</p>
        <hr/>
        <small>SalesDream</small>
      `;

      if (typeof sendMail === "function") {
        await sendMail({ to: email, subject, html });
      } else {
        console.warn("sendMail helper not available — welcome email skipped.");
      }
    } catch (mailErr) {
      console.error("Failed to send welcome email:", mailErr);
    }

    return res.json({ token, user });
  } catch (err) {
    console.error("registerVerify error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// --------------------
// Forgot: request OTP
// --------------------
exports.forgotRequest = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (!rows.length) return res.status(404).json({ message: "Email not found" });

    const otp = genOtp(6);
    setOtp(`forgot:${email}`, otp, OTP_TTL_SECONDS, "forgot");
    await sendOtpEmail(email, otp);
    return res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("forgotRequest error:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

// --------------------
// Forgot: verify OTP only (phase 2)
// --------------------
exports.forgotVerifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Email and OTP required" });

  try {
    const rec = getOtpRecord(`forgot:${email}`);
    if (!rec || rec.otp !== String(otp)) return res.status(400).json({ message: "Invalid or expired OTP" });

    return res.json({ message: "OTP valid" });
  } catch (err) {
    console.error("forgotVerifyOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------
// Forgot: reset password (phase 3) - updates DB and emails confirmation
// --------------------
// Replace the old forgotReset with this function in backend/src/controllers/authController.js

exports.forgotReset = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ message: "Missing required fields" });

  try {
    const rec = getOtpRecord(`forgot:${email}`);
    if (!rec || rec.otp !== String(otp)) return res.status(400).json({ message: "Invalid or expired OTP" });

    // Hash and update DB. Update both password_hash and password columns per your table.
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ?, password = ? WHERE email = ?", [hash, newPassword, email]);

    // clear OTP now that password is changed
    clearOtp(`forgot:${email}`);

    // Build confirmation email
    const subject = "SalesDream — Password changed";
    const html = `
      <h3>Your password has been changed</h3>
      <p>Dear user,</p>
      <p>Your account <b>${email}</b> password was updated successfully.</p>
      <p><b>New credentials</b></p>
      <ul>
        <li>Email: ${email}</li>
        <li>Password: ${newPassword}</li>
      </ul>
      <p>If you did not perform this change, contact support immediately.</p>
    `;

    // Correct usage of sendMail from utils/email.js (object form)
    // If your utils exports sendMail(options)
    if (typeof sendMail === "function") {
      await sendMail({ to: email, subject, html });
    } else {
      // fallback: if your utils exposes sendOtpEmail/sendPasswordResetEmail, use that instead
      if (typeof sendPasswordResetEmail === "function") {
        await sendPasswordResetEmail(email, newPassword); // adjust if your helper signature differs
      } else {
        console.warn("No sendMail/sendPasswordResetEmail helper found. Confirmation email skipped.");
      }
    }

    return res.json({ message: "Password updated and confirmation email sent" });
  } catch (err) {
    console.error("forgotReset error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------
// Login endpoints (unchanged)
// --------------------
exports.loginRequest = async (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });
  if (!password) return res.status(400).json({ message: "Password required" });

  try {
    // Allowlist bypass (unchanged)
    if (String(email).toLowerCase() === LOGIN_OTP_BYPASS_EMAIL) {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      if (!rows.length) return res.status(404).json({ message: "Allowlisted user not found" });
      const token = sign(rows[0]);
      return res.json({ bypass: true, token, user: rows[0] });
    }

    // Verify that user exists
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) {
      // don't expose whether email exists too verbosely; return consistent error
      return res.status(404).json({ message: "Invalid email or password" });
    }

    const user = rows[0];

    // Verify password - compare with stored password_hash
    if (!user.password_hash) {
      // fallback if your DB stored plaintext in 'password' (not recommended)
      if (user.password && user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
    } else {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ message: "Invalid email or password" });
    }

    // At this point, credentials are valid — issue OTP and send it
    const otp = genOtp(6);
    setOtp(`login:${email}`, otp, OTP_TTL_SECONDS, "login");

    // sendOtpEmail is imported from utils/email.js
    await sendOtpEmail(email, otp);
    return res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("loginRequest error:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.loginVerify = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Missing required fields" });
  try {
    const rec = getOtpRecord(`login:${email}`);
    if (!rec || rec.otp !== String(otp)) return res.status(400).json({ message: "Invalid or expired OTP" });

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    let user = rows[0];
    if (!user) {
      const randomPwd = Math.random().toString(36).slice(2);
      const hash = await bcrypt.hash(randomPwd, 10);
      const [r] = await pool.query("INSERT INTO users (name, email, password_hash, password, role) VALUES (?,?,?,?,?)", ["", email, hash, randomPwd, "user"]);
      user = { id: r.insertId, email, name: "", role: "user" };
    }

    const token = sign(user);
    clearOtp(`login:${email}`);
    return res.json({ token, user });
  } catch (err) {
    console.error("loginVerify error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --------------------
// GET /api/auth/me
// --------------------
exports.me = async (req, res) => {
  res.json({ user: req.user || null });
};
