var express = require('express')
var router = express.Router()
const AuthController = require('../controllers/auth.controller')
const StudentController = require('../controllers/student.controller')


router.post('/validate', AuthController.isLoggedIn, async function (req, res) {
    try {
        const { topics } = req.body;
        await StudentController.validateStudent(req._user.id, topics);
        res.json({ success: true });
    } catch (err) {
        return res.status(err.status).json(err.code);
    }
});

router.get('/info', AuthController.isLoggedIn, async function (req, res) {
    try {
        const student = await StudentController.getStudentByUid(req._user.id);
        res.json(student);
    } catch (err) {
        return res.status(400).json("OTHER");
    }
});

module.exports = router