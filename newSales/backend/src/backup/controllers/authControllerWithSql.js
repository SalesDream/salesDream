const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function sign(user){
  return jwt.sign({ id:user.id, email:user.email, role:user.role }, process.env.JWT_SECRET || "devsecret", { expiresIn: "7d" });
}

exports.register = async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  try {
    const [found] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
    if (found.length) return res.status(409).json({ message: "Email already registered" });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query("INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)", [name||"", email, hash, "user"]);
    res.json({ id:r.insertId, email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    if (!rows.length) return res.status(401).json({ message: "Invalid credentials" });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = sign(user);
    res.json({ token, user: { id:user.id, email:user.email, role:user.role, name:user.name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};
