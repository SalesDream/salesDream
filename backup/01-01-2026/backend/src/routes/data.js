// src/routes/data.js
const express = require('express');
const router = express.Router();

const dataController = require('../controllers/dataController');

/**
 * GET /api/data/leads
 * Query params are passed straight through to the controller (limit, offset, filters, etc.)
 * Example: /api/data/leads?limit=100&offset=0&city=New%20York
 */
router.get('/leads', dataController.getLeads);

/**
 * Export ALL leads (NEW)
 */
router.get('/leads/export', dataController.exportLeads);

/**
 * Optional: GET /api/data/lead/:id
 * Simple helper to fetch a single record by OpenSearch _id (if your controller exposes such function).
 * If you don't have a getLeadById controller, this route returns 404.
 *
 * You can implement getLeadById in controllers/dataController.js later.
 */
router.get('/lead/:id', async (req, res) => {
  if (typeof dataController.getLeadById === 'function') {
    return dataController.getLeadById(req, res);
  }
  return res.status(404).json({ message: 'Not implemented' });
});

module.exports = router;
