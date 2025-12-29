// src/routes/export.js
const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

// Start export: expects JSON body with filters matching your buildQuery shape
router.post('/start', exportController.startExport);

// Poll status: GET /api/export/status/:jobId
router.get('/status/:jobId', exportController.getStatus);

// Download file (public URL served from /exports), client just links to /exports/<filename>
// Optional: you could protect this endpoint if files should be private.

module.exports = router;
