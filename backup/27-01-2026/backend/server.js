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
const coldEmailRoutes = require("./src/modules/coldEmail/routes");
const { startColdEmailWorker } = require("./src/modules/coldEmail/worker");

const app = express();
app.set("trust proxy", 1); // 👈 REQUIRED behind NGINX + HTTPS
/* =========================
   CORS
   ========================= */

// Allow multiple origins (dev + prod)
// You can also pass comma-separated origins in CLIENT_URLS env
const CLIENT_URL = process.env.CLIENT_URL; // optional single
const CLIENT_URLS = process.env.CLIENT_URLS; // optional comma list

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://74.207.233.156:3000",
  "http://74.207.233.156", // if later using nginx on :80
  "https://app.salesdream.com",
  ...(CLIENT_URL ? [CLIENT_URL] : []),
  ...(CLIENT_URLS ? CLIENT_URLS.split(",").map(s => s.trim()).filter(Boolean) : []),
];

const corsOptions = {
  origin: (origin, cb) => {
    // allow no-origin requests (curl/postman/server-to-server)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);

   // return cb(new Error(`CORS blocked origin: ${origin}`));
     return cb(null, false);
  },
  credentials: true,
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
  optionsSuccessStatus: 204,
};

// ✅ Must be before routes
app.use(cors(corsOptions));
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
app.use("/api/cold-email", coldEmailRoutes);

/* =========================
   Start
   ========================= */
const PORT = process.env.PORT || 5000;
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  app.listen(PORT, "127.0.0.1", () =>
  console.log(`Server running on http://127.0.0.1:${PORT}`)
);
if (process.env.COLD_EMAIL_WORKER_ENABLED !== "false") {
  const intervalMs = Number(process.env.COLD_EMAIL_WORKER_INTERVAL_MS || 15000);
  const batchSize = Number(process.env.COLD_EMAIL_WORKER_BATCH || 20);
  startColdEmailWorker({ intervalMs, batchSize });
}
