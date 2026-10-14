/**
 * Health Check Route
 * GET /api/health
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'ReelSnap API',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    nodeVersion: process.version,
  });
});

module.exports = router;
