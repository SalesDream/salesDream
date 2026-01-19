const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required for authentication");
}

exports.auth = (req, res, next) => {
  const hdr = req.headers["authorization"] || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId =
      payload?.id || payload?.userId || payload?.uid || payload?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    req.user = { ...payload, id: userId };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
};
