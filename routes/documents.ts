var express = require('express');
var router = express.Router();
import * as DocumentController from '../controllers/document.controller';
import * as AuthController from '../controllers/auth.controller';


router.use(AuthController.isLoggedIn);

router.get('/view', async (req, res) => {
    let { id } = req.query;
    try {
        let buffer = await DocumentController.getDocument(req._user, id);
        res.send(buffer);
    } catch(err) {
        res.status(400).json(err);
    }
});

export default router