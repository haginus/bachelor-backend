var express = require('express')
var router = express.Router()
const AuthController = require('../controllers/auth.controller')
const TeacherController = require('../controllers/teacher.controller')

router.use(AuthController.isLoggedIn);
router.use(AuthController.isTeacher);

router.post('/validate', async function (req, res) {
    try {
        await TeacherController.validateTeacher(req._user.id);
        res.json({ success: true });
    } catch (err) {
        return res.status(err.status).json(err.code);
    }
});

router.get('/offers', async (req, res) => {
    try {
        const offers = await TeacherController.getOffers(req._user.id);
        res.json(offers)
    } catch(err) {
        res.status(400).json("BAD_REQUEST");
    }
});

router.post('/offers/edit', async (req, res) => {
    const { id, domainId, topicIds, limit } = req.body;
    try {
        const offer = await TeacherController.editOffer(req._user.id, id, domainId, topicIds, limit);
        res.json(offer)
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
});

router.post('/offers/add', async (req, res) => {
    const { domainId, topicIds, limit } = req.body;
    try {
        const offer = await TeacherController.addOffer(req._user.id, domainId, topicIds, limit);
        res.json(offer)
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
});

router.get('/applications', async (req, res) => {
    try {
        const applications = await TeacherController.getApplications(req._user.id, null, null);
        res.json(applications)
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
});

router.post('/applications/decline', async (req, res) => {
    const { applicationId } = req.body;
    try {
        const result = await TeacherController.declineApplication(req._user, applicationId);
        res.json(result)
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
});

router.post('/applications/accept', async (req, res) => {
    const { applicationId } = req.body;
    try {
        const result = await TeacherController.acceptApplication(req._user, applicationId);
        res.json(result)
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
});

router.get('/domains', async function (req, res) {
    let domains = await TeacherController.getDomains();
    res.json(domains);
});

module.exports = router;