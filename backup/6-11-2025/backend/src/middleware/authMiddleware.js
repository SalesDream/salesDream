const jwt = require("jsonwebtoken");
module.exports = function(req, res, next){
  const token = req.headers["authorization"]?.split(" ")[1];
  if(!token) return res.status(401).json({message: "No token"});
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  }catch(err){
    return res.status(403).json({message:"Invalid token"});
  }
}
