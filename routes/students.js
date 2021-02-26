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
    let { topicIds, teacherName, onlyFree } = req.query
    try {
        topicIds = topicIds?.split(',').map(id => {
            let x = parseInt(id);
            if(isNaN(x) || !isFinite(x))
                throw "PARSE_ERROR";
            return x;
        });
        if(onlyFree == 'true') {
            onlyFree = true
        } else {
            onlyFree = false
        }
        let filters = {
            teacherName,
            topicIds,
            onlyFree
        }
        let teacherOffers = await StudentController.getTeacherOffers(req._user.id, filters);
        res.json(teacherOffers);
    } catch (err) {
        console.log(err)
        return res.status(400).json("BAD_REQUEST");
    }
});

module.exports = router