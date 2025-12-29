// backend/src/routes/auth.js
const router = require("express").Router();
// const passport = require("passport");
const authController = require("../controllers/authController");
const { auth } = require("../middleware/auth");
const googleConfig = require("../config/google");
const { sign } = googleConfig || { sign: () => "" };
const passport = require("../config/passport-google"); // registers strategy
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

// helper to sign a JWT for a user object
function signUser(user) {
  // user should have at least { id, email, role } or similar
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || "user",
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Helper: check whether a user is blocked.
 * Returns true when user exists and is_blocked === 1.
 * Works whether is_blocked is number or string.
 */
function isBlocked(user) {
  if (!user) return false;
  return Number(user.is_blocked) === 1;
}

// Registration
router.post("/register-request", authController.registerRequest);
router.post("/register-verify", authController.registerVerify);

// Forgot password (OTP send, OTP verify, reset)
router.post("/forgot-request", authController.forgotRequest);
router.post("/forgot-verify-otp", authController.forgotVerifyOtp); // new: verify OTP only
router.post("/forgot-reset", authController.forgotReset); // new: reset password (requires otp + newPassword)

// Login (OTP)
router.post("/login-request", authController.loginRequest);
router.post("/login-verify", authController.loginVerify);

// Protected
router.get("/me", auth, authController.me);
router.post("/change-password", auth, authController.changePassword);

// Legacy fallback
router.post("/register", authController.register || ((req, res) => res.status(404).json({ message: "Legacy register not implemented" })));
router.post("/login", authController.login || ((req, res) => res.status(404).json({ message: "Legacy login not implemented" })));

// Google OAuth
// start Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// callback: after Google authenticates, passport sets req.user
// We ensure we do NOT issue tokens to blocked users (is_blocked === 1).
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: (process.env.CLIENT_URL || "http://localhost:3000") + "/login",
    session: false,
  }),
  (req, res) => {
    try {
      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

      // If for some reason req.user isn't present, redirect to login with failure.
      if (!req.user) {
        return res.redirect(clientUrl + "/login?error=" + encodeURIComponent("Authentication failed"));
      }

      // Prevent blocked users from receiving a token.
      if (isBlocked(req.user)) {
        // Redirect back to client login page with a clear error message.
        const redirect = clientUrl + "/login?error=" + encodeURIComponent("Your account has been blocked. Contact support.");
        return res.redirect(redirect);
      }

      // Normal flow: issue token and redirect with token & role
      const token = signUser(req.user);
      const role = req.user.role || "user";
      const redirect =
        clientUrl +
        `/oauth-success?token=${encodeURIComponent(token)}&role=${encodeURIComponent(role)}`;
      return res.redirect(redirect);
    } catch (err) {
      console.error("Google callback error:", err);
      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      return res.redirect(clientUrl + "/login?error=" + encodeURIComponent("OAuth error"));
    }
  }
);

module.exports = router;
