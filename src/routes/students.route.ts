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


router.post('/validate', async function (req, res, next) {
    const { topics } = req.body;
    await StudentController.validateStudent(req._user, topics)
        .catch(err => next(err));
    res.json({ success: true });
});

router.use(isValidated());

router.get('/teacher-offers', async function (req, res, next) {
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
    let teacherOffers = await StudentController.getTeacherOffers(req._user, filters)
        .catch(err => next(err));
    res.json(teacherOffers);
});

router.get('/teacher-offers/suggested', async function (req, res, next) {
    let teacherOffers = await StudentController.getSuggestedTeacherOffers(req._user)
        .catch(err => next(err));
    res.json(teacherOffers); 
});

router.post('/teacher-offers/apply', async function (req, res, next) {
    const { offerId, title, description, usedTechnologies } = req.body;
    await StudentController.applyToOffer(req._user, offerId, title, description, usedTechnologies)
        .catch(err => next(err));
    res.json({ success: true });
});

router.get('/applications', async (req, res, next) => {
    let { state } = req.query;
    if(!['accepted', 'declined', 'pending'].includes(state as string)) {
        state = null;
    }
    const applications = await StudentController.getApplications(req._user, state as string)
        .catch(err => next(err));
    res.json(applications)
});

router.post('/applications/cancel', async (req, res, next) => {
    const { applicationId } = req.body;
    const result = await StudentController.cancelApplication(req._user, applicationId)
        .catch(err => next(err));
    res.json(result)
});

router.get('/paper', async (req, res, next) => {
    const paper = await StudentController.getPaper(req._user)
        .catch(err => next(err));
    res.json(paper)
});

router.post('/paper/edit', async (req, res, next) => {
    const { title, description, topicIds } = req.body;
    const result = await StudentController.editPaper(req._user, title, description, topicIds)
        .catch(err => next(err));
    res.json(result);
});

router.get('/extra-data', async (req, res, next) => {
    const data = await StudentController.getExtraData(req._user)
        .catch(err => next(err));
    res.json(data)
});

router.post('/extra-data/set', async (req, res, next) => {
    const data = await StudentController.setExtraData(req._user, req.body)
        .catch(err => next(err));
    res.json(data);
});

router.get('/paper/documents/get-required', async (req, res, next) => {
    let documents = await StudentController.getPaperRequiredDocuments(req._user)
        .catch(err => next(err));
    res.json(documents);
});

router.post('/paper/documents/upload', fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 }  // 100MB limit
}), async function(req, res, next) {
    const { name, type } = req.body;
    let result = await StudentController.uploadPaperDocument(req._user, req.files.file as UploadedFile, name, type)
        .catch(err => next(err));
    res.json(result);
});

export default router;