const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

module.exports = (passport) => {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails && profile.emails[0]?.value;
        const name = profile.displayName || "";

        // Find existing by google_id or email
        const [byGoogle] = await pool.query("SELECT * FROM users WHERE google_id=?", [googleId]);
        let user = byGoogle[0];
        if (!user && email) {
          const [byEmail] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
          if (byEmail.length) user = byEmail[0];
        }
        if (!user) {
          const [ins] = await pool.query(
            "INSERT INTO users (name, email, google_id, role) VALUES (?,?,?,?)",
            [name, email, googleId, "user"]
          );
          const [rows] = await pool.query("SELECT * FROM users WHERE id=?", [ins.insertId]);
          user = rows[0];
        } else if (!user.google_id) {
          await pool.query("UPDATE users SET google_id=? WHERE id=?", [googleId, user.id]);
        }
        done(null, user);
      } catch (e) {
        console.error(e);
        done(e);
      }
    }
  ));
};

// helper to sign JWT
module.exports.sign = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for Google auth");
  }
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};
