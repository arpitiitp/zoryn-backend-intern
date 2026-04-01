const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// All /api/dashboard routes require authentication and are accessible by Viewer, Analyst, and Admin
router.use(authenticateToken, requireRole(['VIEWER', 'ANALYST', 'ADMIN']));

router.get('/summary', dashboardController.getSummary.bind(dashboardController));
router.get('/trends', dashboardController.getTrends.bind(dashboardController));

module.exports = router;
