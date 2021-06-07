import express from 'express'
const router = express.Router()
import fileUpload, { UploadedFile } from 'express-fileupload';
import * as TeacherController from '../controllers/teacher.controller';
import isLoggedIn from './middlewares/isLoggedIn';
import isType from './middlewares/isType';
import isValidated from './middlewares/isValidated';

router.use(isLoggedIn());
router.use(isType('teacher'));

router.post('/validate', function (req, res, next) {
    TeacherController.validateTeacher(req._user.id)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.use(isValidated());

router.get('/offers', (req, res, next) => {
    TeacherController.getOffers(req._user.id)
        .then(offers => res.json(offers))
        .catch(err => next(err));
});

router.post('/offers/edit', (req, res, next) => {
    const { id, domainId, topicIds, limit } = req.body;
    TeacherController.editOffer(req._user.id, id, domainId, topicIds, limit)
        .then(offer => res.json(offer))
        .catch(err => next(err));
});

router.post('/offers/add', (req, res, next) => {
    const { domainId, topicIds, limit } = req.body;
    TeacherController.addOffer(req._user.id, domainId, topicIds, limit)
        .then(offer => res.json(offer))
        .catch(err => next(err));
});

router.get('/applications', (req, res, next) => {
    let offerId = parseInt(req.query.offerId as string);
    let state = req.query.state as string;
    if(isNaN(offerId)) {
        offerId = null;
    }
    if(!['accepted', 'declined', 'pending'].includes(state)) {
        state = null;
    }
    TeacherController.getApplications(req._user.id, offerId, state)
        .then(applications => res.json(applications))
        .catch(err => next(err));
});

router.post('/applications/decline', (req, res, next) => {
    const { applicationId } = req.body;
    TeacherController.declineApplication(req._user, applicationId)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/applications/accept', (req, res, next) => {
    const { applicationId } = req.body;
    TeacherController.acceptApplication(req._user, applicationId)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/domains', function (req, res, next) {
    TeacherController.getDomains()
        .then(domains => res.json(domains))
        .catch(err => next(err));
});

router.get('/papers', function (req, res, next) {
    TeacherController.getStudentPapers(req._user)
        .then(papers => res.json(papers))
        .catch(err => next(err));
});

router.post('/papers/documents/upload', fileUpload(), function (req, res, next) {
    const { paperId, perspective, name, type } = req.body;
    TeacherController.uploadPaperDocument(req._user, req.files.file as UploadedFile,
        name, type, perspective, +paperId)
        .then(document => res.json(document))
        .catch(err => next(err));
});

router.post('/papers/remove', function (req, res, next) {
    const { paperId } = req.body;
    TeacherController.removePaper(req._user, +paperId)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/papers/grade', function (req, res, next) {
    const { paperId, forPaper, forPresentation } = req.body;
    TeacherController.gradePaper(req._user, +paperId, +forPaper, +forPresentation)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.get('/committees', function (req, res, next) {
    TeacherController.getCommittees(req._user)
        .then(committees => res.json(committees))
        .catch(err => next(err));
});

router.get('/committees/:id', function (req, res, next) {
    const { id } = req.params;
    TeacherController.getCommitteee(req._user, +id)
        .then(committee => res.json(committee))
        .catch(err => next(err));
});

router.post('/committees/:id/mark-grades-final', function (req, res, next) {
    const { id } = req.params;
    
    TeacherController.markGradesAsFinal(req._user, +id)
        .then(result => res.json(result))
        .catch(err => next(err));
});

export default router;