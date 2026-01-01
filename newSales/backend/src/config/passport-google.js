// backend/src/config/passport-google.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../config/db"); // your mysql pool
const { sign } = require("../controllers/authController"); // or re-export sign helper
// If sign isn't exported, re-create JWT signer here:
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required for Google OAuth");
}
function signUser(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: (process.env.BACKEND_URL || "http://localhost:5000") + "/api/auth/google/callback",
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // profile contains user info
        const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
        const name = profile.displayName || "";

        if (!email) return done(new Error("No email returned from Google"));

        // find or create user
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length) {
          // user exists
          const user = rows[0];
          return done(null, user);
        }

        // create a new user with random password (or blank) - you already had similar logic
        const randomPwd = Math.random().toString(36).slice(2);
        const bcrypt = require("bcryptjs");
        const hash = await bcrypt.hash(randomPwd, 10);

        const [r] = await pool.query(
          "INSERT INTO users (name, email, password_hash, password, role) VALUES (?, ?, ?, ?, ?)",
          [name, email, hash, randomPwd, "user"]
        );

        const user = { id: r.insertId, email, name, role: "user" };
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// optional: passport serialize/deserialize for session-based flows (not used if session: false)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    done(null, rows[0] || null);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
