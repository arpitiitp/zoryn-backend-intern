const express = require('express');
const router = express.Router();
const recordController = require('../controllers/financialRecordController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { validateRequest, schemas } = require('../middlewares/validateRequest');

// All /api/records routes require authentication
router.use(authenticateToken);

// Read configurations
router.get('/', requireRole(['ADMIN', 'ANALYST']), recordController.getAll.bind(recordController));
router.get('/:id', requireRole(['ADMIN', 'ANALYST']), recordController.getOne.bind(recordController));
router.get('/:id/audit-logs', requireRole(['ADMIN', 'ANALYST']), recordController.getLogs.bind(recordController));

// Write configurations (ADMIN only)
router.post('/', requireRole(['ADMIN']), validateRequest(schemas.createRecord), recordController.create.bind(recordController));
router.put('/:id', requireRole(['ADMIN']), validateRequest(schemas.createRecord), recordController.update.bind(recordController)); // Same schema for full update
router.delete('/:id', requireRole(['ADMIN']), recordController.delete.bind(recordController));

module.exports = router;
