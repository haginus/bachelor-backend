var express = require('express');
var router = express.Router();
const DocumentController = require('../controllers/document.controller')
const AuthController = require('../controllers/auth.controller')


router.use(AuthController.isLoggedIn);

router.get('/view', async (req, res) => {
    let { id } = req.query;
    try {
        let buffer = await DocumentController.getDocument(req._user, id);
        console.log(buffer);
        res.send(buffer);
    } catch(err) {
        res.status(400).json(err);
    }
});

module.exports = router