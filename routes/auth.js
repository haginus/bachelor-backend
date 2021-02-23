var express = require('express');
var router = express.Router();

const AuthController = require('../controllers/auth.controller')

router.post('/login', AuthController.login);

router.post('/change-password-token', AuthController.changePasswordWithActivationCode)

module.exports = router