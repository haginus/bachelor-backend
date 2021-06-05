import { Router } from 'express';
var router = Router()
import fileUpload, { UploadedFile } from 'express-fileupload';
import { isLoggedIn, isAdmin } from '../controllers/auth.controller';
import * as AdminController from '../controllers/admin.controller';
import { ResponseError } from '../util/util';

router.use(isLoggedIn);
router.use(isAdmin);


router.get('/stats', async function (req, res, next) {
    const stats = await AdminController.getStats()
        .catch(err => next(err));
    res.json(stats);
});

// STUDENTS

router.get('/students', async function (req, res, next) {
    let { sort, order, page, pageSize } = req.query;
    const students = await AdminController.getStudents(sort, order, null, +page, +pageSize)
        .catch(err => next(err));
    res.json(students);
});

router.get('/student', async function (req, res, next) {
    let { id } = req.query;
    const student = await AdminController.getStudent(+id)
        .catch(err => next(err));
    res.json(student);
});

router.post('/students/add', async function (req, res, next) {
    let { firstName, lastName, CNP, email, group, specializationId, identificationCode, promotion,
        studyForm, fundingForm, matriculationYear } = req.body;
    const student = await AdminController.addStudent(firstName, lastName, CNP, email, group,
        specializationId, identificationCode, promotion, studyForm, fundingForm, matriculationYear)
        .catch(err => next(err));
    res.json(student);
});

router.post('/students/edit', async function (req, res, next) {
    let { id, firstName, lastName, CNP, group, specializationId, identificationCode, promotion,
        studyForm, fundingForm, matriculationYear } = req.body;
    const student = await AdminController.editStudent(id, firstName, lastName, CNP, group, specializationId,
        identificationCode, promotion, studyForm, fundingForm, matriculationYear)
        .catch(err => next(err));
    res.json(student);
});

router.post('/students/add-bulk', fileUpload(), async function(req, res, next) {
    try {
        let { specializationId, studyForm } = req.body;
        if(!specializationId) {
            throw new ResponseError('Lipsește ID-ul specializării.');
        }
        if(!['if', 'id', 'ifr'].includes(studyForm)) {
            throw new ResponseError('Formă de studiu invalidă.');
        }
        if(!req.files?.file) {
            throw new ResponseError('Lipsește fișierul CSV.');
        }
        let fileBuffer = (req.files.file as UploadedFile).data;
        let result = await AdminController.addStudentBulk(fileBuffer, specializationId, 'if');
        res.json(result);
    } catch(err) {
        next(err);
    }
});

router.post('/users/delete', async function (req, res, next) {
    try {
        let { id } = req.body;
        if(!id) {
            throw new ResponseError('Lipsește ID-ul utilizatorului.');
        }
        const result = await AdminController.deleteUser(id);
        res.json({ result });
    } catch (err) {
        next(err);
    }
});

// TEACHERS

router.get('/teachers', async function (req, res, next) {
    let { sort, order, page, pageSize } = req.query;
    const teachers = await AdminController.getTeachers(sort as string, order as 'ASC' | 'DESC', null, +page, +pageSize)
        .catch(err => next(err));
    res.json(teachers);
});

router.post('/teachers/add', async function (req, res, next) {
    let { title, firstName, lastName, CNP, email } = req.body;
    const teacher = await AdminController.addTeacher(title, firstName, lastName, CNP, email)
        .catch(err => next(err));
    res.json(teacher);
});

router.post('/teachers/edit', async function (req, res, next) {
    let { id, title, firstName, lastName, CNP } = req.body;
    const teacher = await AdminController.editTeacher(id, title, firstName, lastName, CNP)
        .catch(err => next(err));
    res.json(teacher);
});

router.post('/teachers/add-bulk', fileUpload(), async function(req, res, next) {
    let result = await AdminController.addTeacherBulk((req.files.file as UploadedFile).data)
        .catch(err => next(err));
    res.json(result);
});

// DOMAINS

router.get('/domains', async function (req, res, next) {
    let domains = await AdminController.getDomains()
        .catch(err => next(err));
    res.json(domains);
});

router.get('/domains/extra', async function (req, res, next) {
    let domains = await AdminController.getDomainsExtra()
        .catch(err => next(err));
    res.json(domains);
});

router.post('/domains/add', async (req, res, next) => {
    const { name, type, specializations } = req.body;
    let domain = await AdminController.addDomain(name, type, specializations)
        .catch(err => next(err));
    return res.json(domain);
});

router.post('/domains/edit', async (req, res, next) => {
    const { id, name, type, specializations } = req.body;
    let domain = await AdminController.editDomain(id, name, type, specializations)
        .catch(err => next(err));
    return res.json(domain);
});

router.post('/domains/delete', async (req, res, next) => {
    const { id } = req.body;
    if(!id || isNaN(id)) {
        return next(new ResponseError("Lipsește ID-ul domeniului."));
    }
    await AdminController.deleteDomain(id)
        .catch(err => next(err));
    res.status(200).json({ success: true });
});

// TOPICS
router.get('/topics', async function (req, res, next) {
    let { sort, order, page, pageSize } = req.query;
    const topics = await AdminController.getTopics(sort, order, null, +page, +pageSize)
        .catch(err => next(err));
    res.json(topics);
});

router.post('/topics/add', async (req, res, next) => {
    const { name } = req.body;
    let topic = await AdminController.addTopic(name)
        .catch(err => next(err));
    return res.json(topic);
});


router.post('/topics/edit', async (req, res, next) => {
    const { id, name } = req.body;
    let topic = await AdminController.editTopic(id, name)
        .catch(err => next(err));
    return res.json(topic);

});

router.post('/topics/delete', async (req, res, next) => {
    const { id, moveId } = req.body;
    if(!id || isNaN(id) || !moveId || isNaN(moveId)) {
        return next(new ResponseError("ID-uri greșite."));
    }
    await AdminController.deleteTopic(id, moveId)
        .catch(err => next(err));
    res.status(200).json({ success: true });
});

// COMMITTEES

router.get('/committees', async function (req, res, next) {
    const committees = await AdminController.getCommittees()
        .catch(err => next(err));
    res.json(committees);
});

router.get('/committees/:id', async function (req, res, next) {
    const { id } = req.params;
    const committee = await AdminController.getCommittee(+id)
        .catch(err => next(err));
    res.json(committee);
});

router.post('/committees/add', async (req, res, next) => {
    const { name, domains, members } = req.body;
    await AdminController.addCommittee(name, domains, members)
        .catch(err => next(err));
    res.status(200).json({ success: true });
});

router.post('/committees/edit', async (req, res, next) => {
    const { id, name, domains, members } = req.body;
    await AdminController.editCommittee(id, name, domains, members)
        .catch(err => next(err));
    res.status(200).json({ success: true });
});

router.post('/committees/delete', async (req, res, next) => {
    const { id } = req.body;
    await AdminController.deleteCommittee(id)
        .catch(err => next(err));
    res.status(200).json({ success: true });
});

router.post('/committees/assign-papers', async (req, res, next) => {
    const { id, paperIds } = req.body;
    if(!id || !Array.isArray(paperIds)) {
        return next(new ResponseError("Parametri lipsă."));
    }
    await AdminController.setCommitteePapers(id, paperIds)
        .catch(err => next(err));
    res.status(200).json({ success: true });
});

router.post('/committees/auto-assign-papers', async (req, res, next) => {
    const result = await AdminController.autoAssignCommitteePapers()
        .catch(err => next(err));
    res.json(result);
});

router.get('/committees/documents/:documentName', async (req, res, next) => {
    const { documentName } = req.params;
    try {
        let result: Buffer;
        if(documentName == 'committee_compositions') {
            result = await AdminController.generateCommitteeCompositions();
        } else if(documentName == 'committee_students') {
            result = await AdminController.generateCommitteeStudents();
        } else {
            throw new ResponseError("Documentul cerut nu există.");
        }
        res.contentType("application/pdf");
        res.send(result);
    } catch(err) {
        next(err);
    }
});

// PAPERS
router.get('/papers', async function (req, res, next) {
    let { sort, order, page, pageSize, assigned, assignedTo, forCommittee, isValid, minified } = req.query;
    let filter = {
        assigned: assigned != undefined ? assigned == 'true' || assigned == '1' : null,
        assignedTo: assignedTo != undefined ? Number(assignedTo) : null,
        forCommittee: forCommittee != undefined ? Number(forCommittee) : null,
        isValid: isValid != undefined ? isValid == 'true' || isValid == '1' : null,
    }
    let pageAsNumber = Number(page);
    let pageSizeAsNumber = Number(pageSize);
    if(isNaN(pageAsNumber) || isNaN(pageSizeAsNumber) || pageAsNumber < 0 || pageSizeAsNumber < 0) {
        pageSizeAsNumber = null;
        pageAsNumber = null;
    }
    const boolMinified = minified == 'true' || minified == '1';
    const papers = await AdminController.getPapers(<string>sort, <'ASC' | 'DESC'>order, filter,
        pageAsNumber, pageSizeAsNumber, boolMinified)
        .catch(err => next(err));
    res.json(papers);
});

router.post('/papers/validate', async (req, res, next) => {
    const { paperId, validate } = req.body;
    await AdminController.validatePaper(paperId, validate)
        .catch(err => next(err));
    res.json({ success: true });
});

// SESSION SETTINGS

router.post('/session', async (req, res, next) => {
    const settings = req.body;
    await AdminController.changeSessionSettings(settings)
        .catch(err => next(err));
    res.json({ success: true });
});

router.post('/session/new', async (req, res, next) => {
    const { password } = req.body;
    await AdminController.beginNewSession(req._user, password)
        .catch(err => next(err));
    res.json({ success: true });
});

export default router;