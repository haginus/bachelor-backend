import express from 'express';
const router = express.Router();
import fileUpload, { UploadedFile } from 'express-fileupload';
import * as AdminController from '../controllers/admin.controller';
import * as DocumentController from '../controllers/document.controller';
import { ResponseError } from '../util/util';
import { generateFinalReport, getGerationStatus, getLatestReportAccessToken, getReport } from '../util/final-report';
import isLoggedIn, { defaultGetToken } from './middlewares/isLoggedIn';
import isType from './middlewares/isType';
import { PaperType, StudyForm } from '../models/models';
import fs from "fs";
import sudo from './middlewares/sudo';
import { ServerSentEventsHandler } from '../util/sse';

router.get('/session/report/download', (req, res, next) => {
    const reportPath = getReport(req.query.token as string);
    res.setHeader('Content-Disposition', 'attachment; filename=Raport final.zip');
    res.setHeader("content-type", "archive/zip");
    fs.createReadStream(reportPath).pipe(res);
});

router.use(isLoggedIn({ 
    getToken: (req) => {
        return defaultGetToken(req) || req.query.token as string;
    }
}));
router.use(isType(['admin', 'secretary']));

router.get('/stats', function (req, res, next) {
    AdminController.getStats()
        .then(stats => res.json(stats))
        .catch(err => next(err));
});

// STUDENTS

router.get('/students', function (req, res, next) {
    let { sort, order, page, pageSize, domainId, specializationId, group, promotion, email } = req.query;
    const filter = { domainId, specializationId, group, promotion, email } as any;
    AdminController.getStudents(sort, order, filter, +page, +pageSize)
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
    let { id, firstName, lastName, CNP, email, group, specializationId, identificationCode, promotion,
        studyForm, fundingForm, matriculationYear } = req.body;
    AdminController.editStudent(id, firstName, lastName, CNP, email, group, specializationId,
        identificationCode, promotion, studyForm, fundingForm, matriculationYear)
        .then(student => res.json(student))
        .catch(err => next(err));
});

router.post('/students/:id/extra-data', function (req, res, next) {
    let { id } = req.params;
    AdminController.editStudentExtraData(+id, req.body)
        .then(result => res.json(result))
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

router.post('/users/delete', sudo({ soft: true }), async function (req, res, next) {
    try {
        let { id } = req.body;
        if(!id) {
            throw new ResponseError('Lipsește ID-ul utilizatorului.');
        }
        const result = await AdminController.deleteUser(req, id);
        res.json({ result });
    } catch (err) {
        next(err);
    }
});

// TEACHERS

router.get('/teachers', isType('admin'), function (req, res, next) {
    let { sort, order, page, pageSize } = req.query;
    AdminController.getTeachers(sort as string, order as 'ASC' | 'DESC', null, +page, +pageSize)
        .then(teachers => res.json(teachers))
        .catch(err => next(err));
});

router.post('/teachers/add', isType('admin'), function (req, res, next) {
    let { title, firstName, lastName, CNP, email } = req.body;
    AdminController.addTeacher(title, firstName, lastName, CNP, email)
        .then(teacher => res.json(teacher))
        .catch(err => next(err));
});

router.post('/teachers/edit', isType('admin'), function (req, res, next) {
    let { id, title, firstName, lastName, CNP, email } = req.body;
    AdminController.editTeacher(id, title, firstName, lastName, CNP, email)
        .then(teacher => res.json(teacher))
        .catch(err => next(err));
});

router.post('/teachers/add-bulk', isType('admin'), fileUpload(), function(req, res, next) {
    AdminController.addTeacherBulk((req.files.file as UploadedFile).data)
        .then(result => res.json(result))
        .catch(err => next(err));
});

// ADMINS

router.get('/admins', isType('admin'), sudo(), function (req, res, next) {
    AdminController.getAdmins()
        .then(admins => res.json(admins))
        .catch(err => next(err));
});

router.post('/admins/add', isType('admin'), sudo(), function (req, res, next) {
    let { firstName, lastName, email, type } = req.body;
    AdminController.addAdmin(firstName, lastName, email, type)
        .then(admin => res.json(admin))
        .catch(err => next(err));
});

router.post('/admins/edit', isType('admin'), sudo(), function (req, res, next) {
    let { id, firstName, lastName, type } = req.body;
    AdminController.editAdmin(+id, firstName, lastName, type)
        .then(admin => res.json(admin))
        .catch(err => next(err));
});

// REQUESTS

router.get('/sign-up-requests', function (req, res, next) {
    AdminController.getSignUpRequests()
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/sign-up-requests/excel', function (req, res, next) {
    DocumentController.generateSignUpRequestExcel()
        .then(result => res.send(result))
        .catch(err => next(err));
});

router.post('/sign-up-requests/:id/decline', function (req, res, next) {
    let { id } = req.params;
    AdminController.declineSignUpRequest(+id)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/sign-up-requests/:id/accept', function (req, res, next) {
    let { id } = req.params;
    AdminController.acceptSignUpRequest(+id, req.body)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/users/resend-activation-code', function(req, res, next) {
    AdminController.resendUserActivationCode(req.body.id)
        .then(result => res.json({ success: true }))
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

router.post('/domains/add', isType('admin'), (req, res, next) => {
    const { name, type, paperType, specializations } = req.body;
    AdminController.addDomain(name, type, paperType, specializations)
        .then(domain => res.json(domain))
        .catch(err => next(err));
});

router.post('/domains/edit', isType('admin'), (req, res, next) => {
    const { id, name, type, paperType, specializations } = req.body;
    AdminController.editDomain(id, name, type, paperType, specializations)
        .then(domain => res.json(domain))
        .catch(err => next(err));
});

router.post('/domains/delete', isType('admin'), (req, res, next) => {
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

router.post('/topics/add', isType('admin'), (req, res, next) => {
    const { name } = req.body;
    AdminController.addTopic(name)
        .then(topic => res.json(topic))
        .catch(err => next(err));
});

router.post('/topics/edit', isType('admin'), (req, res, next) => {
    const { id, name } = req.body;
    AdminController.editTopic(id, name)
        .then(topic => res.json(topic))
        .catch(err => next(err));
});

router.post('/topics/delete', isType('admin'), (req, res, next) => {
    const { id, moveId } = req.body;
    if(!id || isNaN(id) || !moveId || isNaN(moveId)) {
        return next(new ResponseError("ID-uri greșite."));
    }
    AdminController.deleteTopic(id, moveId)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/topics/bulk-delete', isType('admin'), (req, res, next) => {
    const { ids, moveId } = req.body;
    if(!ids || !Array.isArray(ids)) {
        return next(new ResponseError("ID-uri greșite."));
    }
    AdminController.bulkDeleteTopics(ids, moveId)
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

router.post('/committees/add', isType('admin'), (req, res, next) => {
    const { name, domains, members } = req.body;
    AdminController.addCommittee(name, domains, members)
        .then(result => res.json({ success: true })) 
        .catch(err => next(err));
});

router.post('/committees/edit', isType('admin'), (req, res, next) => {
    const { id, name, domains, members } = req.body;
    AdminController.editCommittee(id, name, domains, members)
        .then(result => res.json({ success: true })) 
        .catch(err => next(err));
});

router.post('/committees/delete', isType('admin'), (req, res, next) => {
    const { id } = req.body;
    AdminController.deleteCommittee(id)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/committees/finalGrades', isType('admin'), (req, res, next) => {
    const { id, finalGrades } = req.body;
    AdminController.markCommitteeFinalGrades(id, finalGrades)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/committees/assign-papers', isType('admin'), (req, res, next) => {
    const { id, paperIds } = req.body;
    if(!id || !Array.isArray(paperIds)) {
        return next(new ResponseError("Parametri lipsă."));
    }
    AdminController.setCommitteePapers(req._user, id, paperIds)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/committees/auto-assign-papers', isType('admin'), (req, res, next) => {
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
        } else if(documentName == 'committee_students_excel') {
            result = await AdminController.generateCommitteeStudentsExcel();
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
    let { sort, order, page, pageSize, assigned, assignedTo, forCommittee, isValid, isNotValid, submitted, type, domainId, studyForm, title, studentName, minified } = req.query;
    let filter = {
        assigned: assigned != undefined ? assigned == 'true' || assigned == '1' : null,
        assignedTo: assignedTo != undefined ? Number(assignedTo) : null,
        forCommittee: forCommittee != undefined ? Number(forCommittee) : null,
        isValid: isValid != undefined ? isValid == 'true' || isValid == '1' : null,
        isNotValid: isNotValid != undefined ? isNotValid == 'true' || isNotValid == '1' : null,
        submitted: submitted != undefined ? submitted == 'true' || submitted == '1' : null,
        type: type != undefined ? ["bachelor", "diploma", "master"].includes(type as string) ? type as PaperType : null : null,
        title: title != undefined ? title as string : null,
        domainId: domainId != undefined ? Number(domainId) : null,
        studyForm: studyForm != undefined ? ["if", "ifr", "id"].includes(studyForm as string) ? studyForm as StudyForm : null : null,
        studentName: studentName != undefined ? studentName as string : null,
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

router.post('/papers/:paperId/reupload-requests', (req, res, next) => {
    const { paperId } = req.params;
    AdminController.requestDocumentsReupload(req._user, +paperId, req.body)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.delete('/papers/:paperId/reupload-requests/:id', (req, res, next) => {
    const { id } = req.params;
    AdminController.cancelDocumentReuploadRequest(req._user, +id)
        .then(_ => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/papers/validate', (req, res, next) => {
    const { paperId, validate, generalAverage, ignoreRequiredDocs } = req.body;
    AdminController.validatePaper(req._user, paperId, validate, parseFloat(generalAverage), ignoreRequiredDocs)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/papers/validate/undo', (req, res, next) => {
    const { paperId } = req.body;
    AdminController.undoPaperValidation(req._user, paperId)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/papers/documents/upload', fileUpload(), (req, res, next) => {
    const { paperId, name, type } = req.body;
    AdminController.uploadPaperDocument(req._user, req.files.file as UploadedFile,
        name, type, +paperId)
        .then(document => res.json(document))
        .catch(err => next(err));
});

// SESSION SETTINGS

router.post('/session', isType('admin'), (req, res, next) => {
    const settings = req.body;
    AdminController.changeSessionSettings(settings)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.get('/session/report', isType('admin'), (req, res, next) => {
    res.send(getGerationStatus());
});

router.get('/session/report/generate', isType('admin'), (req, res, next) => {
    const handler = new ServerSentEventsHandler(res);
    generateFinalReport(handler)
        .catch(err => next(err))
        .finally(() => handler.close());
});

router.get('/session/report/token', isType('admin'), (req, res, next) => {
    const result = getLatestReportAccessToken();
    res.send(result);
});

router.post('/session/new', isType('admin'), sudo(), (req, res, next) => {
    AdminController.beginNewSession(req._user)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/reports/paper_list', isType('admin'), (req, res, next) => {
    let where: Parameters<typeof DocumentController.generatePaperList>[0] = {};
    if(req.query.submitted !== undefined) {
        where.submitted = req.query.submitted == 'true';
    }
    DocumentController.generatePaperList(where)
        .then(result => res.send(result))
        .catch(err => next(err));
});

export default router;