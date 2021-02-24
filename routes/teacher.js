var express = require('express')
var router = express.Router()
const AuthController = require('../controllers/auth.controller')
const TeacherController = require('../controllers/teacher.controller')

router.post('/validate', AuthController.isLoggedIn, async function (req, res) {
    try {
        await TeacherController.validateTeacher(req._user.id);
        res.json({ success: true });
    } catch (err) {
        return res.status(err.status).json(err.code);
    }
});

module.exports = router;