// server.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");
const dataRoutes = require("./src/routes/data");
const adminRoutes = require('./src/routes/admin');
const exportRoutes = require('./src/routes/export');

const app = express();

// CORS options
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const corsOptions = {
  origin: CLIENT_URL,
  credentials: true, // allow cookies to be sent
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  // Allow common headers + ngrok dev header that caused your error
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
    "ngrok-skip-browser-warning",
    "Origin",
    "Referer",
    "User-Agent"
  ],
  // If client needs to read custom headers from response, add them here
  exposedHeaders: [
    "Content-Disposition",
    "Content-Type",
    "Content-Length",
    "X-Job-Id"
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Use CORS for all routes
app.use(cors(corsOptions));

// Also explicitly respond to OPTIONS preflight for any path (helps some setups)
app.options('*', cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.get("/", (_, res) => res.json({ ok: true, service: "salesdream-api" }));

app.use(passport.initialize());
try { require("./src/config/google")(passport); } catch (e) { /* optional */ }

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use('/api/admin', adminRoutes);

// Export routes
app.use('/api/export', exportRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
