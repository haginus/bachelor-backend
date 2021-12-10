import express from 'express'
const router = express.Router()
import {StudentController} from '../controllers/student.controller';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { ResponseError } from '../util/util';
import isLoggedIn from './middlewares/isLoggedIn';
import isType from './middlewares/isType';
import isValidated from './middlewares/isValidated';

router.use(isLoggedIn());
router.use(isType('student'));


router.post('/validate', function (req, res, next) {
    const { topics } = req.body;
    StudentController.validateStudent(req._user, topics)
        .then(_ => res.json(res.json({ success: true })))
        .catch(err => next(err));
});

router.use(isValidated());

router.get('/teacher-offers', function (req, res, next) {
    let { topicIds, teacherName, onlyFree } = req.query;
    let topicIdsArray: number[];
    try {
        topicIdsArray = (topicIds as string)?.split(',').map(id => {
            let x = parseInt(id);
            if(isNaN(x) || !isFinite(x))
                throw "PARSE_ERROR";
            return x;
        });
    } catch(err) {
        return next(new ResponseError('Id-urile temelor sunt greșite'));
    };
    let filters = {
        teacherName: teacherName as string,
        topicIds: topicIdsArray,
        onlyFree: onlyFree == 'true'
    }
    StudentController.getTeacherOffers(req._user, filters)
        .then(teacherOffers => res.json(teacherOffers))
        .catch(err => next(err));
});

router.get('/teacher-offers/suggested', function (req, res, next) {
    StudentController.getSuggestedTeacherOffers(req._user)
        .then(teacherOffers => res.json(teacherOffers))
        .catch(err => next(err));
});

router.post('/teacher-offers/apply', function (req, res, next) {
    const { offerId, title, description, usedTechnologies } = req.body;
    StudentController.applyToOffer(req._user, offerId, title, description, usedTechnologies)
        .then(_ => res.json({ success: true }))
        .catch(err => next(err));
});

router.get('/applications', (req, res, next) => {
    let { state } = req.query;
    if(!['accepted', 'declined', 'pending'].includes(state as string)) {
        state = null;
    }
    StudentController.getApplications(req._user, state as string)
        .then(applications => res.json(applications))
        .catch(err => next(err));
});

router.post('/applications/cancel', (req, res, next) => {
    const { applicationId } = req.body;
    StudentController.cancelApplication(req._user, applicationId)
        .then(_ => res.json({ success: true }))
        .catch(err => next(err));
});

router.get('/paper', (req, res, next) => {
    StudentController.getPaper(req._user)
        .then(paper => res.json(paper))
        .catch(err => next(err));
});

router.post('/paper/edit', (req, res, next) => {
    const { title, description, topicIds } = req.body;
    StudentController.editPaper(req._user, title, description, topicIds)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/paper/submit', (req, res, next) => {
    const { submit } = req.body;
    StudentController.submitPaper(req._user, submit)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/extra-data', (req, res, next) => {
    StudentController.getExtraData(req._user)
        .then(data => res.json(data))
        .catch(err => next(err));
});

router.post('/extra-data/set', (req, res, next) => {
    StudentController.setExtraData(req._user, req.body)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/paper/documents/get-required', (req, res, next) => {
    StudentController.getPaperRequiredDocuments(req._user)
        .then(documents => res.json(documents))
        .catch(err => next(err));
});

router.post('/paper/documents/upload', fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 }  // 100MB limit
}), function(req, res, next) {
    const { name, type } = req.body;
    StudentController.uploadPaperDocument(req._user, req.files.file as UploadedFile, name, type)
        .then(result => res.json(result))
        .catch(err => next(err));
});

export default router;