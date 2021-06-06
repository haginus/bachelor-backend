import express from 'express';
const router = express.Router();
import * as AuthController from '../controllers/auth.controller';

router.post('/login', async (req, res, next) => {
    const { email, password } = req.body;
    const response = await AuthController.loginWithEmailAndPassword(email, password)
        .catch(err => next(err));
    res.json(response);
});

router.post('/reset-password', async (req, res, next) => {
    const { email } = req.body;
    const result = await AuthController.resetPassword(email)
        .catch(err => next(err));
    res.json(result);
});

router.post('/change-password-token', async (req, res, next) => {
    const { token, password } = req.body;
    const response = await AuthController.changePasswordWithActivationCode(token, password)
        .catch(err => next(err));
    res.json(response);
});

router.get('/session', async (req, res, next) => {
    const result = await AuthController.getSessionSettings()
        .catch(err => next(err));
    res.json(result);
});

export default router