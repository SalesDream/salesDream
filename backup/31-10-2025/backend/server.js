const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");
const dataRoutes = require("./src/routes/data");

const app = express();
app.use(cors({
  origin: [
    "http://localhost:3000",       // for local development
    "http://139.144.56.127:3000"  , // for deployed frontend
    "http://139.144.56.127:4200/"
  ],
  credentials: true  // allow cookies / auth headers
}));

app.use(express.json());
app.use(cookieParser());

app.get("/", (_,res)=>res.json({ok:true, service:"salesdream-api"}));

app.use(passport.initialize());
require("./src/config/google")(passport);

app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
