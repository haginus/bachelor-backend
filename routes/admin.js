var express = require('express')
var router = express.Router()
const AuthController = require('../controllers/auth.controller')
const AdminController = require('../controllers/admin.controller')

router.use(AuthController.isLoggedIn);
router.use(AuthController.isAdmin);


router.get('/students', async function (req, res) {
    try {
        const students = await AdminController.getStudents();
        res.json(students);
    } catch (err) {
        console.log(err)
        return res.status(500).json("INTERNAL_ERROR");
    }
});

module.exports = router