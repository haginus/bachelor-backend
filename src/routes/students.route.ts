import express from 'express'
const router = express.Router()
import * as AuthController from '../controllers/auth.controller';
import {StudentController} from '../controllers/student.controller';
import fileUpload, { UploadedFile } from 'express-fileupload';

router.use(AuthController.isLoggedIn);
router.use(AuthController.isStudent);


router.post('/validate', async function (req, res) {
    try {
        const { topics } = req.body;
        await StudentController.validateStudent(req._user.id, topics);
        res.json({ success: true });
    } catch (err) {
        return res.status(err.status).json(err.code);
    }
});

router.get('/info', async function (req, res) {
    try {
        const student = await StudentController.getStudentByUid(req._user.id);
        res.json(student);
    } catch (err) {
        return res.status(400).json("OTHER");
    }
});

router.get('/teacher-offers', async function (req, res) {
    let { topicIds, teacherName, onlyFree } = req.query
    try {
        let topicIdsArray = (topicIds as string)?.split(',').map(id => {
            let x = parseInt(id);
            if(isNaN(x) || !isFinite(x))
                throw "PARSE_ERROR";
            return x;
        });
        let filters = {
            teacherName,
            topicIds: topicIdsArray,
            onlyFree: onlyFree == 'true'
        }
        let teacherOffers = await StudentController.getTeacherOffers(req._user.id, filters);
        res.json(teacherOffers);
    } catch (err) {
        console.log(err)
        return res.status(400).json("BAD_REQUEST");
    }
});

router.get('/teacher-offers/suggested', async function (req, res) {
    try {
        let teacherOffers = await StudentController.getSuggestedTeacherOffers(req._user.id);
        res.json(teacherOffers); 
    } catch(err) {
        return res.status(400).json("BAD_REQUEST");
    }
});

router.post('/teacher-offers/apply', async function (req, res) {
    try {
        const { offerId, title, description, usedTechnologies } = req.body;
        if(!offerId || !title || !description) {
            return res.status(400).json("BAD_REQUEST");
        }
        await StudentController.applyToOffer(req._user.id, offerId, title, description, usedTechnologies);
        res.json({ success: true });
    } catch(err) {
        if(typeof err == "string") {
            return res.status(400).json(err);
        }
        return res.status(500).json("INTERNAL_ERROR");
    }
});

router.get('/applications', async (req, res) => {
    let { state } = req.query;
    if(!['accepted', 'declined', 'pending'].includes(state as string)) {
        state = null;
    }
    try {
        const applications = await StudentController.getApplications(req._user.id, state);
        res.json(applications)
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
});

router.post('/applications/cancel', async (req, res) => {
    const { applicationId } = req.body;
    try {
        const result = await StudentController.cancelApplication(req._user, applicationId);
        res.json(result)
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
});

router.get('/paper', async (req, res) => {
    try {
        const paper = await StudentController.getPaper(req._user.id);
        res.json(paper)
    } catch(err) {
        console.log(err)
        res.status(500).json("");
    }
});

router.post('/paper/edit', async (req, res) => {
    try {
        const { title, description, topicIds } = req.body;
        const result = await StudentController.editPaper(req._user, title, description, topicIds);
        res.json(result);
    } catch(err) {
        console.log(err)
        res.status(500).json("");
    }
});

router.get('/extra-data', async (req, res) => {
    try {
        const data = await StudentController.getExtraData(req._user.id);
        res.json(data)
    } catch(err) {
        console.log(err)
        res.status(500).json("");
    }
});

router.post('/extra-data/set', async (req, res) => {
    try {
        const data = await StudentController.setExtraData(req._user.id, req.body);
        res.json(data);
    } catch(err) {
        res.status(400).json(err);
    }
});

router.get('/paper/documents/get-required', async (req, res) => {
    try {
        let documents = await StudentController.getPaperRequiredDocuments(req._user);
        res.json(documents);
    } catch(err) {
        res.status(400).json(err);
    }
});

router.post('/paper/documents/upload', fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 }  // 2MB limit
}), async function(req, res) {
    try {
        const { name, type } = req.body;
        let result = await StudentController.uploadPaperDocument(req._user, req.files.file as UploadedFile, name, type);
        res.json(result);
    } catch(err) {
        res.status(400).json(err);
    }
});

export default router;