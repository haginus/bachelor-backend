import { Router } from 'express';
var router = Router()
import fileUpload, { UploadedFile } from 'express-fileupload';
import { isLoggedIn, isAdmin } from '../controllers/auth.controller';
import * as AdminController from '../controllers/admin.controller';
import { ResponseError } from '../util/util';

router.use(isLoggedIn);
router.use(isAdmin);


router.get('/stats', async function (req, res) {
    try {
        const stats = await AdminController.getStats();
        res.json(stats);
    } catch (err) {
        console.log(err)
        return res.status(500);
    }
});

// STUDENTS

router.get('/students', async function (req, res) {
    try {
        let { sort, order, page, pageSize } = req.query;
        let pageAsNumber = Number(page);
        let pageSizeAsNumber = Number(pageSize); 
        const students = await AdminController.getStudents(sort, order, null, pageAsNumber, pageSizeAsNumber);
        res.json(students);
    } catch (err) {
        console.log(err)
        return res.status(500).json(err);
    }
});

router.get('/student', async function (req, res) {
    try {
        let { id } = req.query;
        const student = await AdminController.getStudent(Number(id));
        res.json(student);
    } catch (err) {
        console.log(err)
        return res.status(500).json("INTERNAL_ERROR");
    }
});

router.post('/students/add', async function (req, res) {
    try {
        let { firstName, lastName, CNP, email, group, specializationId, identificationCode, promotion,
            studyForm, fundingForm, matriculationYear } = req.body;
        const student = await AdminController.addStudent(firstName, lastName, CNP, email, group,
                                    specializationId, identificationCode, promotion, studyForm, fundingForm, matriculationYear);
        res.json(student);
    } catch (err) {
        console.log(err)
        return res.status(500).json(err);
    }
});

router.post('/students/edit', async function (req, res) {
    try {
        let { id, firstName, lastName, CNP, group, specializationId, identificationCode, promotion,
            studyForm, fundingForm, matriculationYear } = req.body;
        const student = await AdminController.editStudent(id, firstName, lastName, CNP, group, specializationId,
                                                identificationCode, promotion, studyForm, fundingForm, matriculationYear);
        res.json(student);
    } catch (err) {
        console.log(err);
        return res.status(500).json(err);
    }
});

router.post('/students/add-bulk', fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 }  // 2MB limit
}), async function(req, res) {
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
        console.log(err);
        res.status(err.httpStatusCode).json(err);
    }
});

router.post('/users/delete', async function (req, res) {
    try {
        let { id } = req.body;
        if(!id) {
            throw "BAD_REQUEST";
        }
        const result = await AdminController.deleteUser(id);
        res.json({ result });
    } catch (err) {
        return res.status(400).json(err);
    }
});

// TEACHERS

router.get('/teachers', async function (req, res) {
    try {
        let { sort, order, page, pageSize } = req.query;
        let pageAsNumber = Number(page);
        let pageSizeAsNumber = Number(pageSize); 
        const teachers = await AdminController.getTeachers(sort as string, order as 'ASC' | 'DESC', null, pageAsNumber, pageSizeAsNumber);
        res.json(teachers);
    } catch (err) {
        console.log(err)
        return res.status(500).json(err);
    }
});

router.post('/teachers/add', async function (req, res) {
    try {
        let { title, firstName, lastName, CNP, email } = req.body;
        const teacher = await AdminController.addTeacher(title, firstName, lastName, CNP, email);
        res.json(teacher);
    } catch (err) {
        console.log(err)
        return res.status(500).json(err);
    }
});

router.post('/teachers/edit', async function (req, res) {
    try {
        let { id, title, firstName, lastName, CNP } = req.body;
        const teacher = await AdminController.editTeacher(id, title, firstName, lastName, CNP);
        res.json(teacher);
    } catch (err) {
        console.log(err);
        return res.status(500).json(err);
    }
});

router.post('/teachers/add-bulk', fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 }  // 2MB limit
}), async function(req, res) {
    try {
        let result = await AdminController.addTeacherBulk((req.files.file as UploadedFile).data);
        res.json(result);
    } catch(err) {
        res.status(400).json(err);
    }
});

// DOMAINS

router.get('/domains', async function (req, res) {
    let domains = await AdminController.getDomains();
    res.json(domains);
});

router.get('/domains/extra', async function (req, res) {
    let domains = await AdminController.getDomainsExtra();
    res.json(domains);
});

router.post('/domains/add', async (req, res) => {
    const { name, type, specializations } = req.body;
    try {
        let domain = await AdminController.addDomain(name, type, specializations);
        return res.json(domain);
    } catch(err) {
        console.log(err)
        res.status(400).json("BAD_REQUEST")
    }
});

router.post('/domains/edit', async (req, res) => {
    const { id, name, type, specializations } = req.body;
    try {
        let domain = await AdminController.editDomain(id, name, type, specializations);
        return res.json(domain);
    } catch(err) {
        console.log(err)
        res.status(400).json("BAD_REQUEST")
    }
});

router.post('/domains/delete', async (req, res) => {
    const { id } = req.body;
    if(!id || isNaN(id)) {
        return res.status(400).json("BAD_REQUEST");
    }
    try {
        await AdminController.deleteDomain(id);
        res.status(200).json({ success: true });
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

// TOPICS
router.get('/topics', async function (req, res) {
    try {
        let { sort, order, page, pageSize } = req.query;
        let pageAsNumber = Number(page);
        let pageSizeAsNumber = Number(pageSize); 
        const topics = await AdminController.getTopics(sort, order, null, pageAsNumber, pageSizeAsNumber);
        res.json(topics);
    } catch (err) {
        console.log(err)
        return res.status(500).json(err);
    }
});

router.post('/topics/add', async (req, res) => {
    const { name } = req.body;
    try {
        let topic = await AdminController.addTopic(name);
        return res.json(topic);
    } catch(err) {
        console.log(err)
        res.status(400).json("BAD_REQUEST")
    }
});


router.post('/topics/edit', async (req, res) => {
    const { id, name } = req.body;
    try {
        let topic = await AdminController.editTopic(id, name);
        return res.json(topic);
    } catch(err) {
        console.log(err)
        res.status(400).json("BAD_REQUEST")
    }
});

router.post('/topics/delete', async (req, res) => {
    const { id, moveId } = req.body;
    try {
        if(!id || isNaN(id) || !moveId || isNaN(moveId)) {
            throw new ResponseError("ID-uri greșite.", "BAD_IDS", 401);
        }
        await AdminController.deleteTopic(id, moveId);
        res.status(200).json({ success: true });
    } catch(err) {
        res.status(err.httpStatusCode).json(err);
    }
});

// COMMITTEES

router.get('/committees', async function (req, res) {
    try {
        const committees = await AdminController.getCommittees();
        res.json(committees);
    } catch (err) {
        console.log(err)
        return res.status(500).json("INTERNAL_ERROR");
    }
});

router.get('/committees/:id', async function (req, res) {
    try {
        const { id } = req.params;
        const committee = await AdminController.getCommittee(+id);
        res.json(committee);
    } catch (err) {
        console.log(err)
        return res.status(500).json("INTERNAL_ERROR");
    }
});

router.post('/committees/add', async (req, res) => {
    const { name, domains, members } = req.body;
    try {
        await AdminController.addCommittee(name, domains, members);
        res.status(200).json({ success: true });
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

router.post('/committees/edit', async (req, res) => {
    const { id, name, domains, members } = req.body;
    try {
        await AdminController.editCommittee(id, name, domains, members);
        res.status(200).json({ success: true });
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

router.post('/committees/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await AdminController.deleteCommittee(id);
        res.status(200).json({ success: true });
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

router.post('/committees/assign-papers', async (req, res) => {
    const { id, paperIds } = req.body;
    if(!id || !Array.isArray(paperIds)) {
        return res.status(400).json("BAD_REQUEST");
    }
    try {
        await AdminController.setCommitteePapers(id, paperIds);
        res.status(200).json({ success: true });
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

router.get('/committees/documents/:documentName', async (req, res) => {
    const { documentName } = req.params;
    try {
        let result: Buffer;
        if(documentName == 'committee_compositions') {
            result = await AdminController.generateCommitteeCompositions();
        } else {
            throw "BAD_REQUEST";
        }
        res.contentType("application/pdf");
        res.send(result);
    } catch(err) {
        console.log(err);
        res.status(400).json(err);
    }
});

// PAPERS
router.get('/papers', async function (req, res) {
    try {
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
        const papers = await AdminController.getPapers(<string>sort, <'ASC' | 'DESC'>order, filter, pageAsNumber, pageSizeAsNumber, boolMinified);
        res.json(papers);
    } catch (err) {
        console.log(err)
        return res.status(400).json(err);
    }
});

router.post('/papers/validate', async (req, res) => {
    const { paperId, validate } = req.body;
    try {
        await AdminController.validatePaper(paperId, validate);
        res.json({ success: true });
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
})

// SESSION SETTINGS

router.post('/session', async (req, res) => {
    const settings = req.body;
    try {
        await AdminController.changeSessionSettings(settings);
        res.json({ success: true });
    } catch(err) {
        console.log(err)
        res.status(400).json("BAD_REQUEST");
    }
})

export default router;