var express = require('express')
var router = express.Router()
const AuthController = require('../controllers/auth.controller')
const StudentController = require('../controllers/student.controller')

router.use(AuthController.isLoggedIn);
router.use(AuthController.isStudent);


router.post('/validate', async function (req, res) {
    try {
        const { topics } = req.body;
        await StudentController.validateStudent(req._user.id, topics);
        res.json({ success: true });
    } catch (err) {
        return res.status(err.status).json(err.code);
    }
});

router.get('/info', async function (req, res) {
    try {
        const student = await StudentController.getStudentByUid(req._user.id);
        res.json(student);
    } catch (err) {
        return res.status(400).json("OTHER");
    }
});

router.get('/teacher-offers', async function (req, res) {
    try {
        let teacherOffers = await StudentController.getTeacherOffers(req._user.id);
        res.json(teacherOffers);
    } catch (err) {
        return res.status(500).json("SERVER_ERROR");
    }
});

module.exports = router