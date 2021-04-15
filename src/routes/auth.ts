import { Router } from 'express';
var router = Router();

import { login, changePasswordWithActivationCode, getSessionSettings } from '../controllers/auth.controller';

router.post('/login', login);

router.post('/change-password-token', changePasswordWithActivationCode);

router.get('/session', async (req, res) => {
    let result = await getSessionSettings();
    res.json(result);
});

export default router