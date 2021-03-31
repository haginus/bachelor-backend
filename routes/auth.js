var express = require('express');
var router = express.Router();

const AuthController = require('../controllers/auth.controller')

router.post('/login', AuthController.login);

router.post('/change-password-token', AuthController.changePasswordWithActivationCode);

router.get('/session', async (req, res) => {
    let result = await AuthController.getSessionSettings();
    res.json(result);
});

module.exports = router