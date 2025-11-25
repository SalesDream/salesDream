const router = require("express").Router();
const { auth } = require("../middleware/auth");
const { getLeads } = require("../controllers/dataController");

router.get("/leads", auth, getLeads);

module.exports = router;
