import express from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
const router = express.Router();
import * as AuthController from '../controllers/auth.controller';
import * as UserController from '../controllers/user.controller';
import isLoggedIn from './middlewares/isLoggedIn';

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

router.post('/check-password-token', (req, res, next) => {
    const { token } = req.body;
    AuthController.checkActivationCode(token)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/session', (req, res, next) => {
    AuthController.getSessionSettings()
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.patch('/profile', isLoggedIn(), fileUpload(), (req, res, next) => {
    const { bio, website } = req.body;
    let picture = (req.files?.picture as UploadedFile)?.data;
    UserController.patchProfile(req._user, picture, bio, website)
        .then(result => res.json(result))
        .catch(err => next(err));
});

export default router