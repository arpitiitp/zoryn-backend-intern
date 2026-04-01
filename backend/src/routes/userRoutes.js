const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { validateRequest, schemas } = require('../middlewares/validateRequest');

// All /api/users routes require authentication and ADMIN role
router.use(authenticateToken, requireRole(['ADMIN']));

router.get('/', userController.getAllUsers.bind(userController));

router.post('/', validateRequest(schemas.createUser), userController.createUser.bind(userController));

router.put('/:id', validateRequest(schemas.updateUser), userController.updateUser.bind(userController));

router.patch('/:id/status', validateRequest(schemas.updateUserStatus), userController.updateUserStatus.bind(userController));

module.exports = router;
