import express from 'express'
const router = express.Router()
import fileUpload, { UploadedFile } from 'express-fileupload';
import * as TeacherController from '../controllers/teacher.controller';
import isLoggedIn from './middlewares/isLoggedIn';
import isType from './middlewares/isType';

router.use(isLoggedIn());
router.use(isType('teacher'));

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
    let offerId: string | number = <string>req.query.offerId;
    let state: string = <string>req.query.state;
    if(offerId) {
        offerId = parseInt(offerId);
        if(!isFinite(offerId)) {
            offerId = null;
        }
    }
    if(!['accepted', 'declined', 'pending'].includes(state)) {
        state = null;
    }
    try {
        const applications = await TeacherController.getApplications(req._user.id, offerId, state);
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

router.get('/papers', async function (req, res) {
    let papers = await TeacherController.getStudentPapers(req._user);
    res.json(papers);
});

router.post('/papers/documents/upload', fileUpload(), async function (req, res) {
    const { paperId, perspective, name, type } = req.body;
    try {
        let docuemnt = await TeacherController.uploadPaperDocument(req._user, req.files.file as UploadedFile,
            name, type, perspective, +paperId);
        res.json(docuemnt);
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

router.post('/papers/remove', async function (req, res) {
    const { paperId } = req.body;
    try {
        await TeacherController.removePaper(req._user, +paperId);
        res.json({ success: true });
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

router.post('/papers/grade', async function (req, res) {
    try {
        const { paperId, forPaper, forPresentation } = req.body;
        await TeacherController.gradePaper(req._user, +paperId, +forPaper, +forPresentation);
        res.json({ success: true });
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

router.get('/committees', async function (req, res) {
    try {
        let committees = await TeacherController.getCommittees(req._user);
        res.json(committees);
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

router.get('/committees/:id', async function (req, res) {
    try {
        const { id } = req.params;
        let committee = await TeacherController.getCommitteee(req._user, +id);
        res.json(committee);
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

router.post('/committees/:id/mark-grades-final', async function (req, res) {
    try {
        const { id } = req.params;
        let result = await TeacherController.markGradesAsFinal(req._user, +id);
        res.json(result);
    } catch(err) {
        res.status(err.httpStatusCode).json(err);
    }
});

export default router;