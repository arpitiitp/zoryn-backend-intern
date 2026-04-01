const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest, schemas } = require('../middlewares/validateRequest');

router.post('/login', validateRequest(schemas.login), authController.login.bind(authController));

module.exports = router;
