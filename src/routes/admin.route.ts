import express from 'express';
const router = express.Router();
import fileUpload, { UploadedFile } from 'express-fileupload';
import * as AdminController from '../controllers/admin.controller';
import { ResponseError } from '../util/util';
import { generateFinalReport } from '../util/final-report';
import isLoggedIn from './middlewares/isLoggedIn';
import isType from './middlewares/isType';

router.use(isLoggedIn());
router.use(isType('admin'));


router.get('/stats', function (req, res, next) {
    AdminController.getStats()
        .then(stats => res.json(stats))
        .catch(err => next(err));
});

// STUDENTS

router.get('/students', function (req, res, next) {
    let { sort, order, page, pageSize } = req.query;
    AdminController.getStudents(sort, order, null, +page, +pageSize)
        .then(students => res.json(students))
        .catch(err => next(err));
});

router.get('/student', function (req, res, next) {
    let { id } = req.query;
    AdminController.getStudent(+id)
        .then(student => res.json(student))
        .catch(err => next(err));
});

router.post('/students/add', function (req, res, next) {
    let { firstName, lastName, CNP, email, group, specializationId, identificationCode, promotion,
        studyForm, fundingForm, matriculationYear } = req.body;
    AdminController.addStudent(firstName, lastName, CNP, email, group,
        specializationId, identificationCode, promotion, studyForm, fundingForm, matriculationYear)
        .then(student => res.json(student))
        .catch(err => next(err));
});

router.post('/students/edit', function (req, res, next) {
    let { id, firstName, lastName, CNP, group, specializationId, identificationCode, promotion,
        studyForm, fundingForm, matriculationYear } = req.body;
    AdminController.editStudent(id, firstName, lastName, CNP, group, specializationId,
        identificationCode, promotion, studyForm, fundingForm, matriculationYear)
        .then(student => res.json(student))
        .catch(err => next(err));
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
        let result = await AdminController.addStudentBulk(fileBuffer, specializationId, studyForm);
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

router.get('/teachers', function (req, res, next) {
    let { sort, order, page, pageSize } = req.query;
    AdminController.getTeachers(sort as string, order as 'ASC' | 'DESC', null, +page, +pageSize)
        .then(teachers => res.json(teachers))
        .catch(err => next(err));
});

router.post('/teachers/add', function (req, res, next) {
    let { title, firstName, lastName, CNP, email } = req.body;
    AdminController.addTeacher(title, firstName, lastName, CNP, email)
        .then(teacher => res.json(teacher))
        .catch(err => next(err));
});

router.post('/teachers/edit', function (req, res, next) {
    let { id, title, firstName, lastName, CNP } = req.body;
    AdminController.editTeacher(id, title, firstName, lastName, CNP)
        .then(teacher => res.json(teacher))
        .catch(err => next(err));
});

router.post('/teachers/add-bulk', fileUpload(), function(req, res, next) {
    AdminController.addTeacherBulk((req.files.file as UploadedFile).data)
        .then(result => res.json(result))
        .catch(err => next(err));
});

// DOMAINS

router.get('/domains', function (req, res, next) {
    AdminController.getDomains()
        .then(domains => res.json(domains))
        .catch(err => next(err));
});

router.get('/domains/extra', function (req, res, next) {
    AdminController.getDomainsExtra()
        .then(domains => res.json(domains))
        .catch(err => next(err));
});

router.post('/domains/add', (req, res, next) => {
    const { name, type, specializations } = req.body;
    AdminController.addDomain(name, type, specializations)
        .then(domain => res.json(domain))
        .catch(err => next(err));
});

router.post('/domains/edit', (req, res, next) => {
    const { id, name, type, specializations } = req.body;
    AdminController.editDomain(id, name, type, specializations)
        .then(domain => res.json(domain))
        .catch(err => next(err));
});

router.post('/domains/delete', (req, res, next) => {
    const { id } = req.body;
    if(!id || isNaN(id)) {
        return next(new ResponseError("Lipsește ID-ul domeniului."));
    }
    AdminController.deleteDomain(id)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

// TOPICS
router.get('/topics', function (req, res, next) {
    let { sort, order, page, pageSize } = req.query;
    AdminController.getTopics(sort, order, null, +page, +pageSize)
        .then(topics => res.json(topics))
        .catch(err => next(err));
});

router.post('/topics/add', (req, res, next) => {
    const { name } = req.body;
    AdminController.addTopic(name)
        .then(topic => res.json(topic))
        .catch(err => next(err));
});


router.post('/topics/edit', (req, res, next) => {
    const { id, name } = req.body;
    AdminController.editTopic(id, name)
        .then(topic => res.json(topic))
        .catch(err => next(err));
});

router.post('/topics/delete', (req, res, next) => {
    const { id, moveId } = req.body;
    if(!id || isNaN(id) || !moveId || isNaN(moveId)) {
        return next(new ResponseError("ID-uri greșite."));
    }
    AdminController.deleteTopic(id, moveId)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

// COMMITTEES

router.get('/committees', function (req, res, next) {
    AdminController.getCommittees()
        .then(committees => res.json(committees))
        .catch(err => next(err));
});

router.get('/committees/:id', function (req, res, next) {
    const { id } = req.params;
    AdminController.getCommittee(+id)
        .then(committee => res.json(committee))
        .catch(err => next(err));
});

router.post('/committees/add', (req, res, next) => {
    const { name, domains, members } = req.body;
    AdminController.addCommittee(name, domains, members)
        .then(result => res.json({ success: true })) 
        .catch(err => next(err));
});

router.post('/committees/edit', (req, res, next) => {
    const { id, name, domains, members } = req.body;
    AdminController.editCommittee(id, name, domains, members)
        .then(result => res.json({ success: true })) 
        .catch(err => next(err));
});

router.post('/committees/delete', (req, res, next) => {
    const { id } = req.body;
    AdminController.deleteCommittee(id)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/committees/assign-papers', (req, res, next) => {
    const { id, paperIds } = req.body;
    if(!id || !Array.isArray(paperIds)) {
        return next(new ResponseError("Parametri lipsă."));
    }
    AdminController.setCommitteePapers(id, paperIds)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/committees/auto-assign-papers', (req, res, next) => {
    AdminController.autoAssignCommitteePapers()
        .then(result => res.json(result))
        .catch(err => next(err));
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
router.get('/papers', function (req, res, next) {
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
    AdminController.getPapers(<string>sort, <'ASC' | 'DESC'>order, filter,
        pageAsNumber, pageSizeAsNumber, boolMinified)
        .then(papers => res.json(papers))
        .catch(err => next(err));
});

router.post('/papers/validate', (req, res, next) => {
    const { paperId, validate } = req.body;
    AdminController.validatePaper(paperId, validate)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

// SESSION SETTINGS

router.post('/session', (req, res, next) => {
    const settings = req.body;
    AdminController.changeSessionSettings(settings)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.get('/session/report', (req, res, next) => {
    generateFinalReport()
        .then(buffer => res.send(buffer))
        .catch(err => next(err));
});

router.post('/session/new', (req, res, next) => {
    const { password } = req.body;
    AdminController.beginNewSession(req._user, password)
        .then(result => res.json(result))
        .catch(err => next(err));
});

export default router;