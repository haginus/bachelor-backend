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

module.exports = router