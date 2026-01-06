// server.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");
const dataRoutes = require("./src/routes/data");
const adminRoutes = require("./src/routes/admin");
const exportRoutes = require("./src/routes/export");

const app = express();

/* =========================
   CORS
   ========================= */
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const corsOptions = {
  origin: CLIENT_URL,
  credentials: true,

  // ✅ IMPORTANT: include PATCH
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
    "ngrok-skip-browser-warning",
    "Origin",
    "Referer",
    "User-Agent",
  ],

  exposedHeaders: [
    "Content-Disposition",
    "Content-Type",
    "Content-Length",
    "X-Job-Id",
  ],

  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// ✅ Must be before routes
app.use(cors(corsOptions));

// ✅ Handle preflight for all routes
app.options("*", cors(corsOptions));

/* =========================
   Middlewares
   ========================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.get("/", (_, res) => res.json({ ok: true, service: "salesdream-api" }));

app.use(passport.initialize());
try {
  require("./src/config/google")(passport);
} catch (e) {
  /* optional */
}

/* =========================
   Routes
   ========================= */
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/export", exportRoutes);

/* =========================
   Start
   ========================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
