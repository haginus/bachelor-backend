import express from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
const router = express.Router();
import * as AuthController from '../controllers/auth.controller';
import * as UserController from '../controllers/user.controller';
import { SessionSettingsDto } from '../dto/SessionSettingsDto';
import isLoggedIn from './middlewares/isLoggedIn';
import isType from './middlewares/isType';
import reCaptcha from './middlewares/reCaptcha';

router.post('/login', reCaptcha(), (req, res, next) => {
    const { email, password } = req.body;
    AuthController.loginWithEmailAndPassword(email, password)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/reset-password', reCaptcha(), (req, res, next) => {
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

router.post('/impersonate', isLoggedIn(), isType('admin'), (req, res, next) => {
    const { userId } = req.body;
    AuthController.impersonateUser(req._user, +userId)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/release', isLoggedIn(), (req, res, next) => {
    AuthController.releaseImpersonation(req._impersonatedBy)
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
        .then(result => res.json(new SessionSettingsDto(result)))
        .catch(err => next(err));
});

router.patch('/profile', isLoggedIn(), fileUpload(), (req, res, next) => {
    const { bio, website } = req.body;
    let picture = (req.files?.picture as UploadedFile)?.data;
    UserController.patchProfile(req._user, picture, bio, website)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/user', isLoggedIn(), async (req, res, next) => {
    AuthController.getCurrentUser(req._user, !!req._impersonatedBy)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/sign-up', reCaptcha(), async (req, res, next) => {
    AuthController.signUp(req.body)
        .then(result => res.json(result))
        .catch(err => next(err));
});

export default router;