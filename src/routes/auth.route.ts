import { Router } from 'express';
var router = Router();

import { login, changePasswordWithActivationCode, getSessionSettings, resetPassword } from '../controllers/auth.controller';

router.post('/login', login);

router.post('/reset-password', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await resetPassword(email);
        res.json(result);
    } catch(err) {
        res.status(err.httpStatusCode).json(err);
    }
})

router.post('/change-password-token', changePasswordWithActivationCode);

router.get('/session', async (req, res) => {
    let result = await getSessionSettings();
    res.json(result);
});

export default router