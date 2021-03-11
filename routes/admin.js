var express = require('express')
var router = express.Router()
const fileUpload = require('express-fileupload');
const AuthController = require('../controllers/auth.controller')
const AdminController = require('../controllers/admin.controller')

router.use(AuthController.isLoggedIn);
router.use(AuthController.isAdmin);


// STUDENTS

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

router.post('/students/add-bulk', fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 }  // 2MB limit
}), async function(req, res) {
    try {
        let result = await AdminController.addStudentBulk(req.files.file.data);
        res.json(result);
    } catch(err) {
        res.status(400).json(err);
    }
});

router.post('/users/delete', async function (req, res) {
    try {
        let { id } = req.body;
        if(!id) {
            throw "BAD_REQUEST";
        }
        const result = await AdminController.deleteUser(id);
        res.json({ result });
    } catch (err) {
        return res.status(400).json(err);
    }
});

// TEACHERS

router.get('/teachers', async function (req, res) {
    try {
        let { sort, order, page, pageSize } = req.query;
        page = parseInt(page);
        pageSize = parseInt(pageSize);
        const teachers = await AdminController.getTeachers(sort, order, null, page, pageSize);
        res.json(teachers);
    } catch (err) {
        console.log(err)
        return res.status(500).json(err);
    }
});

router.post('/teachers/add', async function (req, res) {
    try {
        let { firstName, lastName, CNP, email } = req.body;
        const teacher = await AdminController.addTeacher(firstName, lastName, CNP, email);
        res.json(teacher);
    } catch (err) {
        console.log(err)
        return res.status(500).json(err);
    }
});

router.post('/teachers/edit', async function (req, res) {
    try {
        let { id, firstName, lastName, CNP } = req.body;
        const teacher = await AdminController.editTeacher(id, firstName, lastName, CNP);
        res.json(teacher);
    } catch (err) {
        console.log(err);
        return res.status(500).json(err);
    }
});

router.post('/teachers/add-bulk', fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 }  // 2MB limit
}), async function(req, res) {
    try {
        let result = await AdminController.addTeacherBulk(req.files.file.data);
        res.json(result);
    } catch(err) {
        res.status(400).json(err);
    }
});

// DOMAINS

router.get('/domains', async function (req, res) {
    let domains = await AdminController.getDomains();
    res.json(domains);
});

router.get('/domains/extra', async function (req, res) {
    let domains = await AdminController.getDomainsExtra();
    res.json(domains);
});

router.post('/domains/add', async (req, res) => {
    const { name, type } = req.body;
    try {
        let domain = await AdminController.addDomain(name, type);
        return res.json(domain);
    } catch(err) {
        console.log(err)
        res.status(400).json("BAD_REQUEST")
    }
});

router.post('/domains/edit', async (req, res) => {
    const { id, name, type } = req.body;
    try {
        let domain = await AdminController.editDomain(id, name, type);
        return res.json(domain);
    } catch(err) {
        console.log(err)
        res.status(400).json("BAD_REQUEST")
    }
});

router.post('/domains/delete', async (req, res) => {
    const { id, moveStudentsTo } = req.body;
    if(!id || isNaN(id) || !moveStudentsTo || isNaN(moveStudentsTo)) {
        return res.status(400).json("BAD_REQUEST");
    }
    try {
        await AdminController.deleteDomain(id, moveStudentsTo);
        res.status(200).json({ success: true });
    } catch(err) {
        console.log(err);
        res.status(500);
    }
});

module.exports = router