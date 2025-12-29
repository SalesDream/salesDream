const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");

router.post("/start", exportController.startExport);
router.get("/status/:jobId", exportController.getStatus);

module.exports = router;
