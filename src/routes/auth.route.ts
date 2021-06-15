import express from 'express';
const router = express.Router();
import * as AuthController from '../controllers/auth.controller';

router.post('/login', (req, res, next) => {
    const { email, password } = req.body;
    AuthController.loginWithEmailAndPassword(email, password)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/reset-password', (req, res, next) => {
    const { email } = req.body;
    AuthController.resetPassword(email)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/change-password-token', (req, res, next) => {
    const { token, password } = req.body;
    AuthController.changePasswordWithActivationCode(token, password)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/session', (req, res, next) => {
    AuthController.getSessionSettings()
        .then(result => res.json(result))
        .catch(err => next(err));
});

export default router