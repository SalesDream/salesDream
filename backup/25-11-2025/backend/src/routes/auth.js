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
// Registration

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
// router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
// start Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// callback (you already have this)
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: (process.env.CLIENT_URL || "http://localhost:3000") + "/login",
    session: false,
  }),
  (req, res) => {
    const token = signUser(req.user);
    const role = req.user.role || "user";
    const redirect =
      (process.env.CLIENT_URL || "http://localhost:3000") +
      `/oauth-success?token=${encodeURIComponent(token)}&role=${encodeURIComponent(role)}`;
    res.redirect(redirect);
  }
);

// router.get(
//   "/google/callback",
//   passport.authenticate("google", {
//     failureRedirect: (process.env.CLIENT_URL || "http://localhost:3000") + "/login",
//     session: false,
//   }),
//   (req, res) => {
//     const token = sign(req.user);
//     const role = req.user.role || "user";
//     const redirect =
//       (process.env.CLIENT_URL || "http://localhost:3000") +
//       `/oauth-success?token=${encodeURIComponent(token)}&role=${encodeURIComponent(role)}`;
//     res.redirect(redirect);
//   }
// );

module.exports = router;
