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
    TeacherController.validateTeacher(req._user)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.use(isValidated());

router.get('/offers', (req, res, next) => {
    TeacherController.getOffers(req._user)
        .then(offers => res.json(offers))
        .catch(err => next(err));
});

router.post('/offers/edit', (req, res, next) => {
    const { id, domainId, topicIds, limit, description } = req.body;
    TeacherController.editOffer(req._user, id, domainId, topicIds, limit, description)
        .then(offer => res.json(offer))
        .catch(err => next(err));
});

router.post('/offers/add', (req, res, next) => {
    const { domainId, topicIds, limit, description } = req.body;
    TeacherController.addOffer(req._user, domainId, topicIds, limit, description)
        .then(offer => res.json(offer))
        .catch(err => next(err));
});

router.post('/offers/delete', (req, res, next) => {
    const { id } = req.body;
    TeacherController.deleteOffer(req._user, id)
        .then(_ => res.json({ suceess: true }))
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
    TeacherController.getApplications(req._user, offerId, state)
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

router.get('/papers/excel', function (req, res, next) {
    TeacherController.getStudentPapersExcel(req._user)
        .then(buffer => res.send(buffer))
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

router.post('/papers/add', function (req, res, next) {
    const { studentId, title, description, topicIds } = req.body;
    TeacherController.addPaper(req._user, +studentId, title, description, topicIds)
        .then(paper => res.json(paper))
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
    TeacherController.getCommittee(req._user, +id)
        .then(committee => res.json(committee))
        .catch(err => next(err));
});

router.post('/committees/:id/mark-grades-final', function (req, res, next) {
    const { id } = req.params;
    
    TeacherController.markGradesAsFinal(req._user, +id)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/students/', function (req, res, next) {
    const { name, domainId } = req.query;
    TeacherController.getStudents(name as string, +domainId)
        .then(students => res.json(students))
        .catch(err => next(err));
});

export default router;