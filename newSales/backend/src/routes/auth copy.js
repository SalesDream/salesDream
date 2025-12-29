const router = require("express").Router();
const passport = require("passport");
const { register, login, me } = require("../controllers/authController");
const { auth } = require("../middleware/auth");
const google = require("../config/google");
const { sign } = require("../config/google");

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, me);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: (process.env.CLIENT_URL || "http://localhost:3000") + "/login", session: false }),
  (req, res) => {
    const token = sign(req.user);
    const role = req.user.role || "user";
    const redirect = (process.env.CLIENT_URL || "http://localhost:3000") + `/oauth-success?token=${encodeURIComponent(token)}&role=${encodeURIComponent(role)}`;
    res.redirect(redirect);
  }
);

module.exports = router;
