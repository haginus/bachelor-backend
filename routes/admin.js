var express = require('express')
var router = express.Router()
const AuthController = require('../controllers/auth.controller')
const AdminController = require('../controllers/admin.controller')

router.use(AuthController.isLoggedIn);
router.use(AuthController.isAdmin);


router.get('/students', async function (req, res) {
    try {
        let { sort, order, page, pageSize } = req.query;
        page = parseInt(page);
        pageSize = parseInt(pageSize);
        const students = await AdminController.getStudents(sort, order, null, page, pageSize);
        res.json(students);
    } catch (err) {
        console.log(err)
        return res.status(500).json(err);
    }
});

router.post('/students/add', async function (req, res) {
    try {
        let { firstName, lastName, CNP, email, group, domainId } = req.body;
        const student = await AdminController.addStudent(firstName, lastName, CNP, email, group, domainId);
        res.json(student);
    } catch (err) {
        console.log(err)
        return res.status(500).json(err);
    }
});

router.post('/students/edit', async function (req, res) {
    try {
        let { id, firstName, lastName, CNP, group, domainId } = req.body;
        const student = await AdminController.editStudent(id, firstName, lastName, CNP, group, domainId);
        res.json(student);
    } catch (err) {
        console.log(err);
        return res.status(500).json(err);
    }
});

router.get('/domains', async function (req, res) {
    let domains = await AdminController.getDomains();
    res.json(domains);
});

module.exports = router