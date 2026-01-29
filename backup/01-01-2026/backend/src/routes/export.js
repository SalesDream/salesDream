// src/routes/export.js
const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");

router.post("/start", exportController.startExport);
router.get("/status/:jobId", exportController.getStatus);
router.get("/download/:jobId", exportController.downloadExport);

// NEW: saved exports listing + download + delete
router.get("/files", exportController.listExportFiles);
router.get("/file/:filename", exportController.downloadByFilename);
router.delete("/files/:filename", exportController.deleteExportFile);


module.exports = router;
