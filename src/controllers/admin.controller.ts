import { Student, User, Domain, Specialization, ActivationToken, Teacher, Topic, Offer, SessionSettings, Committee, CommitteeMember, sequelize, Paper, Document, StudyForm, Application, Profile, PaperType, DomainType, StudentExtraData } from "../models/models";
import * as UserController from './user.controller';
import * as DocumentController from './document.controller';
import * as Mailer from '../alerts/mailer';
import crypto from 'crypto';
import bcrypt from "bcrypt";
import { Op, OrderItem, Sequelize, Transaction, ValidationError, WhereOptions} from "sequelize";
import csv from 'csv-parser';
import { PaperRequiredDocument } from "../paper-required-documents";
import { copyObject, removeDiacritics, ResponseError, ResponseErrorInternal } from "../util/util";
import { autoAssignPapers } from "../util/assign-papers";
import fs from 'fs';
var stream = require('stream');

interface Statistic {
    title: string;
    content: string | number;
    extra?: string,
    sectionPath?: string
}

export const getStats = async (): Promise<Statistic[]> => {
    const studentPromise = Student.count();
    const validatedStudentPromise = User.sum('validated', { where: { type: 'student' } });
    const teacherPromise = Teacher.count();
    const validatedTeacherPromise = User.sum('validated', { where: { type: 'teacher' } });
    const paperPromise = Paper.count({ where: { submitted: true }});
    const assignedPaperPromise = Paper.count({ col: 'committeeId' });
    const committeePromise = Committee.scope('min').findAll();
    const [studentCount, validatedStudentCount, teacherCount, validatedTeacherCount, paperCount, assignedPaperCount, committees] = 
        await Promise.all([studentPromise, validatedStudentPromise, teacherPromise, validatedTeacherPromise, paperPromise, assignedPaperPromise, committeePromise]);
    return [
        { title: 'Studenți', content: studentCount, extra: `din care ${validatedStudentCount} cu cont activ`, sectionPath: 'students' },
        { title: 'Profesori', content: teacherCount, extra: `din care ${validatedTeacherCount} cu cont activ`, sectionPath: 'teachers' },
        { title: 'Lucrări', content: paperCount, extra: `din care ${assignedPaperCount} atribuite`, sectionPath: 'papers' },
        { title: 'Comisii', content: committees.length, sectionPath: 'committees' },
    ]
};

// Students

type SortOrder = 'ASC' | 'DESC';
type Pagination = { limit?: number, offset?: number };
export type StudentQueryFilters = {
    domainId: number;
    specializationId: number;
    group: number;
    promotion: number;
    email: string;
}

export const getStudents = async (sort, order, filter: StudentQueryFilters, page, pageSize) => {
    const limit = pageSize;
    const offset = page * pageSize;
    if (limit <= 0 || offset < 0) {
        throw "INVALID_PARAMETERS";
    }

    let sortArray: OrderItem = ['id', 'ASC']
    if (['id', 'firstName', 'lastName', 'CNP', 'email', 'group', 'domain', 'promotion']
        .includes(sort) && ['ASC', 'DESC'].includes(order)) {
        if (sort == 'group')
            sortArray = ['student', 'group', order];
        else if (sort == 'domain')
            sortArray = ['student', 'domain', 'name', order];
        else if (sort == 'promotion')
            sortArray = ['student', 'promotion', order];
        else
            sortArray = [sort, order];
    }

    const studentWhere = {};
    ['domainId', 'specializationId', 'group', 'promotion'].forEach(filterKey => {
        const value = filter[filterKey];
        if(value) {
            studentWhere[filterKey] = value;
        }
    });
    const userWhere = {};
    if(filter.email) {
        userWhere['email'] = { [Op.substring]: filter.email };
    }

    let query = await User.findAndCountAll({
        where: userWhere,
        attributes: { exclude: ['password'] },
        include: [
            {
                model: sequelize.model('student'),
                required: true,
                where: studentWhere,
                include: [
                    sequelize.model('domain'),
                    sequelize.model('specialization')
                ]
            }],
        limit,
        offset,
        order: [sortArray]
    });
    return query;
}

/** Get student by user ID. */
export const getStudent = (id: number) => {
    return User.findOne({
        where: { id },
        attributes: { exclude: ['password'] },
        include: [{
            model: sequelize.model('student'),
            required: true,
            include: [
                sequelize.model('domain'),
                sequelize.model('specialization')
            ]
        }]
    });
}

export const addStudent = async (firstName, lastName, CNP, email, group, specializationId, identificationCode, promotion,
    studyForm, fundingForm, matriculationYear) => {
    let specialization = await Specialization.findOne({ where: { id: specializationId } });
    if (!specialization) {
        throw "SPECIALIZATION_NOT_FOUND";
    }
    let domainId = specialization.domainId;
    const transaction = await sequelize.transaction();
    try {
        let user = await User.create({ firstName, lastName, CNP, email, type: 'student' }, { transaction }); // create user
        // create student entity
        await Student.create({ id: user.id, group, identificationCode, promotion, studyForm, fundingForm, matriculationYear,
            domainId, specializationId, userId: user.id }, { transaction });
        await Profile.create({ userId: user.id }, { transaction });
        let token = crypto.randomBytes(64).toString('hex'); // generate activation token
        let activationToken = await ActivationToken.create({ token, userId: user.id }, { transaction }); // insert in db
        try {
            await Mailer.sendWelcomeEmail(user, activationToken.token); // send welcome mail
        } catch(err) {
            throw new ResponseErrorInternal(
                'Studentul nu a putut fi creat deoarece serverul de e-mail este indisponibil. Contactați administratorul.',
                'EMAIL_NOT_SENT'
            );
        }
        await transaction.commit(); // commit changes
        return UserController.getUserData(user.id); // return user data
    } catch (err) {
        console.log(err)
        await transaction.rollback(); // if anything goes wrong, rollback
        if(err instanceof ValidationError) {
            if(err.errors[0].validatorKey == 'not_unique') {
                throw new ResponseError('E-mailul introdus este deja luat: ' + email, 'VALIDATION_ERROR');
            }
            throw new ResponseError('Datele introduse sunt incorecte.', 'VALIDATION_ERROR');
        }
        throw err;
    }
}

export const editStudent = async (id, firstName, lastName, CNP, group, specializationId, identificationCode, promotion,
    studyForm, fundingForm, matriculationYear) => {
    let specialization = await Specialization.findOne({ where: { id: specializationId } });
    if (!specialization) {
        throw "SPECIALIZATION_NOT_FOUND";
    }
    let domainId = specialization.domainId;
    const transaction = await sequelize.transaction();
    try {
        let userUpdate = await User.update({ firstName, lastName, CNP }, { // update user data
            where: { id }, transaction
        });
        let studentUpdate = await Student.update({ group, domainId, identificationCode, promotion, specializationId,
            studyForm, fundingForm, matriculationYear }, { // update student data
            where: { userId: id }, transaction
        });
        await transaction.commit();
    } catch(err) {
        console.log(err);
        await transaction.rollback(); // if anything goes wrong, rollback
        throw "VALIDATION_ERROR";
    }
    return UserController.getUserData(id);
}

export const deleteUser = async (id: number) => {
    let result = await User.destroy({ where: { id } });
    return result;
}

export const addStudentBulk = async (file: Buffer, specializationId: number, studyForm: StudyForm) => {
    const specialization = await Specialization.findByPk(specializationId);
    if(!specialization) {
        throw new ResponseError('Specializarea nu a fost găsită.', 'SPECIALIZATION_NOT_FOUND');
    }
    let users = [];
    const HEADERS = [
        ['NUME', 'lastName'],
        ['PRENUME', 'firstName'],
        ['CNP', 'CNP'],
        ['EMAIL', 'email'],
        ['GRUPA', 'group'],
        ['NUMAR_MATRICOL', 'identificationCode'],
        ['PROMOTIE', 'promotion'],
        ['FORMA_FINANTARE', 'fundingForm'],
        ['AN_INMATRICULARE', 'matriculationYear']
    ];
    let headerLength = 0;
    await new Promise((resolve, reject) => {
        var bufferStream = new stream.PassThrough();
        bufferStream.end(file);
        bufferStream
            .pipe(csv({
                mapHeaders: ({ header, index }) => {
                    const expectedHeader = HEADERS[index] && HEADERS[index][0];
                    if(header != expectedHeader) {
                        reject(new ResponseError(`Eroare pe coloana ${index + 1}: se aștepta ` +
                            `"${expectedHeader}", dar s-a citit "${header}".`));
                    }
                    headerLength++;
                    return HEADERS[index] && HEADERS[index][1];
                }
            }))
            .on('data', (data) => users.push(data))
            .on('end', () => {
                if(headerLength != HEADERS.length) {
                    reject(new ResponseError("Lungimea antetului nu coincide cu cea așteptată."));
                }
                resolve(null);
            });
    });
    let promises = users.map(user => {
        let fundingForm: string = removeDiacritics((user.fundingForm || '').trim().toLowerCase());
        if(fundingForm == 'buget') {
            fundingForm = 'budget';
        } else if(fundingForm == 'taxa') {
            fundingForm = 'tax';
        } else {
            throw new ResponseError('Câmpul "formă de finanțare" trebuie să fie buget/taxă.');
        }
        return addStudent(user.firstName, user.lastName, user.CNP, user.email, user.group,
            specializationId, user.identificationCode, user.promotion, studyForm, fundingForm, user.matriculationYear)
    });


    let results = await Promise.allSettled(promises);
    let totalStudents = users.length;

    let response = { students: [], totalStudents, addedStudents: 0 };

    results.forEach(result => {
        if (result.status == 'fulfilled') {
            response.addedStudents++;
            response.students.push(result.value);
        }
    });

    return response;
}

// Teachers

export const getTeachers = async (sort: string, order: 'ASC' | 'DESC', filter, page: number, pageSize: number) => {
    const limit = pageSize || 10;
    const offset = page * pageSize || 0;
    if (limit <= 0 || offset < 0) {
        throw "INVALID_PARAMETERS";
    }

    let sortArray: OrderItem = [ 'id', 'ASC'];
    if (['id', 'firstName', 'lastName', 'CNP', 'email'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        sortArray = [ sort, order];
    } else if(['offerNumber', 'paperNumber'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        sortArray = [ Sequelize.literal(`\`teacher.${sort}\``), order];
    }

    const paperLiteral = Sequelize.literal(`(
        SELECT COUNT(*)
        FROM papers AS paper
        WHERE paper.teacherId = \`teacher\`.id
    )`);

    const bachelorPaperLiteral = Sequelize.literal(`(
        SELECT COUNT(*)
        FROM papers AS paper
        WHERE paper.teacherId = \`teacher\`.id
        and type = 'bachelor'
    )`);

    const diplomaPaperLiteral = Sequelize.literal(`(
        SELECT COUNT(*)
        FROM papers AS paper
        WHERE paper.teacherId = \`teacher\`.id
        and type = 'diploma'
    )`);

    const masterPaperLiteral = Sequelize.literal(`(
        SELECT COUNT(*)
        FROM papers AS paper
        WHERE paper.teacherId = \`teacher\`.id
        and type = 'master'
    )`);

    const offerLiteral = Sequelize.literal(`(
        SELECT COUNT(*)
        FROM offers AS offer
        WHERE offer.teacherId = \`teacher\`.id
    )`);

    let query = await User.findAndCountAll({
        where: { type: "teacher" },
        include: [
            {
                association: User.associations.teacher,
                attributes: {
                    include: [
                        [ paperLiteral, 'paperNumber' ],
                        [ bachelorPaperLiteral, 'bachoolPaperNumber' ],
                        [ diplomaPaperLiteral, 'diplomaPaperNumber' ],
                        [ masterPaperLiteral, 'masterPaperNumber' ],
                        [ offerLiteral, 'offerNumber' ]
                    ]
                }
            }
        ],
        attributes: { exclude: ['password'] },
        limit,
        offset,
        order: [sortArray]
    });
    return query;
}

export const addTeacher = async (title: string, firstName: string, lastName: string, CNP: string, email: string) => {
    const transaction = await sequelize.transaction();
    try {
        let user = await User.create({ title, firstName, lastName, CNP, email, type: 'teacher' }, { transaction });
        await Teacher.create({ id: user.id, userId: user.id }, { transaction });
        await Profile.create({ userId: user.id }, { transaction });
        let token = crypto.randomBytes(64).toString('hex');
        let activationToken = await ActivationToken.create({ token, userId: user.id }, { transaction });
        try {
            await Mailer.sendWelcomeEmail(user, activationToken.token); // send welcome mail
        } catch(err) {
            throw new ResponseErrorInternal(
                'Profesorul nu a putut fi creat deoarece serverul de e-mail este indisponibil. Contactați administratorul.',
                'EMAIL_NOT_SENT'
            );
        }
        await transaction.commit();
        return UserController.getUserData(user.id);
    } catch (err) {
        await transaction.rollback();
        if(err instanceof ValidationError) {
            if(err.errors[0].validatorKey == 'not_unique') {
                throw new ResponseError('E-mailul introdus este deja luat.', 'VALIDATION_ERROR');
            }
            throw new ResponseError('Datele introduse sunt incorecte.', 'VALIDATION_ERROR');
        }
        throw err;
    }
}

export const editTeacher = async (id: number, title: string, firstName: string, lastName: string, CNP: string) => {
    let userUpdate = await User.update({ title, firstName, lastName, CNP }, {
        where: { id }
    });
    return UserController.getUserData(id);
}

export const addTeacherBulk = async (file: Buffer) => {
    const HEADERS = [
        ['TITLU', 'title'],
        ['NUME', 'lastName'],
        ['PRENUME', 'firstName'],
        ['CNP', 'CNP'],
        ['EMAIL', 'email'],
    ];
    let users = [];
    let headerLength = 0;
    await new Promise((resolve, reject) => {
        let bufferStream = new stream.PassThrough();
        bufferStream.end(file);
        bufferStream
            .pipe(csv({
                mapHeaders: ({ header, index }) => {
                    const expectedHeader = HEADERS[index] && HEADERS[index][0];
                    if(header != expectedHeader) {
                        reject(new ResponseError(`Eroare pe coloana ${index + 1}: se aștepta ` + 
                            `"${expectedHeader}", dar s-a citit "${header}".`));
                    }
                    headerLength++;
                    return HEADERS[index] && HEADERS[index][1];
                }
            }))
            .on('data', (data) => users.push(data))
            .on('end', () => {
                if(headerLength != HEADERS.length) {
                    reject(new ResponseError("Lungimea antetului nu coincide cu cea așteptată."));
                }
                resolve(null);
            });
    });

    let promises = users.map(user => {
        const { title, firstName, lastName, CNP, email } = user;
        return addTeacher(title, firstName, lastName, CNP, email);
    });

    let results = await Promise.allSettled(promises);
    let totalTeachers = users.length;
    let response = { teachers: [], totalTeachers, addedTeachers: 0 };

    results.forEach(result => {
        if (result.status == 'fulfilled') {
            response.addedTeachers++;
            response.teachers.push(result.value);
        }
    });

    return response;
}

export const resendUserActivationCode = async (userId: number) => {
    const user = await User.findByPk(userId);
    if(!user) {
        throw new ResponseError("Utilizatorul nu există.");
    }
    const [activationToken, _] = await ActivationToken.findOrCreate({ where: { userId } });
    await Mailer.sendWelcomeEmail(user, activationToken.token);
    return true;
}

// Admins

export const getAdmins = async () => {
    return User.findAll({ where: { type: 'admin' } });
}

export const addAdmin = async (firstName: string, lastName: string, email: string) => {
    const transaction = await sequelize.transaction();
    try {
        let user = await User.create({ firstName, lastName, email, type: 'admin' }, { transaction });
        await Profile.create({ userId: user.id }, { transaction });
        let token = crypto.randomBytes(64).toString('hex');
        let activationToken = await ActivationToken.create({ token, userId: user.id }, { transaction });
        try {
            await Mailer.sendWelcomeEmail(user, activationToken.token); // send welcome mail
        } catch(err) {
            throw new ResponseErrorInternal(
                'Contul nu a putut fi creat deoarece serverul de e-mail este indisponibil. Contactați administratorul.',
                'EMAIL_NOT_SENT'
            );
        }
        await transaction.commit();
        return UserController.getUserData(user.id);
    } catch (err) {
        await transaction.rollback();
        if(err instanceof ValidationError) {
            if(err.errors[0].validatorKey == 'not_unique') {
                throw new ResponseError('E-mailul introdus este deja luat.', 'VALIDATION_ERROR');
            }
            throw new ResponseError('Datele introduse sunt incorecte.', 'VALIDATION_ERROR');
        }
        throw err;
    }
}

export const editAdmin = async (id: number, firstName: string, lastName: string) => {
    let userUpdate = await User.update({ firstName, lastName }, {
        where: { id }
    });
    return UserController.getUserData(id);
}

export const getDomains = () => {
    return Domain.scope("specializations").findAll();
}

export const getDomainsExtra = () => {
    return Domain.scope("specializations").findAll({
        attributes: {
            include: [
                [literals.DOMAIN_STUDENT_NUMBER, 'studentNumber'],
                [literals.DOMAIN_OFFER_NUMBER, 'offerNumber']
            ]
        }
    })
}

export const getDomain = (id) => {
    return Domain.scope("specializations").findOne({
        attributes: {
            include: [
                [literals.DOMAIN_STUDENT_NUMBER, 'studentNumber'],
                [literals.DOMAIN_OFFER_NUMBER, 'offerNumber']
            ]
        },
        where: { id }
    })
}

const ckeckDomainPaperTypes = (domain: DomainType, paperType: PaperType) => {
    if(paperType == null) {
        throw new ResponseError("Tip de lucrare incompatibil.");
    }
    if(domain == 'bachelor') {
        if(!['bachelor', 'diploma'].includes(paperType)) {
            throw new ResponseError("Tip de lucrare incompatibil.");
        }
    } else if(domain == 'master') {
        if(paperType != 'master') {
            throw new ResponseError("Tip de lucrare incompatibil.");
        }
    }
}

export const addDomain = (name: string, type: DomainType, paperType: PaperType, specializations: Specialization[]) => {
    ckeckDomainPaperTypes(type, paperType);
    return Domain.create(
        { name, type, paperType, specializations },
        {
            include: [ sequelize.model('specialization') ]
        }
    );
}

export const editDomain = async (id: string, name: string, type: DomainType, paperType: PaperType, specializations) => {
    ckeckDomainPaperTypes(type, paperType);
    const oldDomain = await getDomain(id); // get old domain data
    if(!oldDomain) {
        throw "BAD_REQUEST";
    }
    const specIds = oldDomain.specializations.map(spec => spec.id);
    const transaction = await sequelize.transaction(); // start transaction
    try {
        await Domain.update({ name, type, paperType }, { where: { id }, transaction }); // update domain data
        let specs = {
            toAdd: specializations.filter(spec => !spec.id), // specs that do not have an id will be added,
            toEdit: specializations.filter(spec => specIds.includes(spec.id)), // specs that have ids in specIds
            toDelete: specIds.filter(specId => !specializations.map(spec => spec.id).includes(specId)) // specs int specIds but not in the new array
        }
        if(specs.toAdd.length > 0) {
            specs.toAdd = specs.toAdd.map(spec => {
                return { name: spec.name, studyYears: spec.studyYears, domainId: oldDomain.id } // add domainId
            });
            await Specialization.bulkCreate(specs.toAdd, { transaction });
        }
        for(let spec of specs.toEdit) {
            await Specialization.update({ name: spec.name, studyYears: spec.studyYears }, { where: { id: spec.id }, transaction });
        }
        if(specs.toDelete.length > 0) {
            specs.toDelete.forEach(specId => { // check if deleted specs have students
                let spec = oldDomain.specializations.find(spec => spec.id == specId);
                if(spec?.studentNumber > 0) {
                    throw "NOT_ALLOWED"
                }
            });
            await Specialization.destroy({ where: {
                id: {
                    [Op.in]: specs.toDelete
                }
            }, transaction });
        }
        await transaction.commit();
    } catch(err) {
        console.log(err)
        await transaction.rollback();
        throw "BAD_REQUEST";
    }
    return getDomain(id);
}

export const deleteDomain = async (id) => {
    const domain = await getDomain(id);
    if(!domain || domain.studentNumber > 0) {
        throw "BAD_REQUEST";
    }
    return Domain.destroy({ where: { id } });
}

// TOPICS

export const getTopics = async (sort, order, filter, page, pageSize) => {
    const limit = pageSize;
    const offset = page * pageSize;
    if (limit <= 0 || offset < 0) {
        throw "INVALID_PARAMETERS";
    }

    let sortArray: OrderItem = ['id', 'ASC']
    if (['id', 'name'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        sortArray = [sort, order];
    }

    let query = await Topic.findAndCountAll({
        limit,
        offset,
        order: [sortArray]
    });
    return query;
}

export const addTopic = (name) => {
    return Topic.create({ name });
}

export const editTopic = (id, name) => {
    return Topic.update({ name }, { where: { id } });
}

export const deleteTopic = async (id: number, moveId: number, transaction?: Transaction) => {
    if(id == moveId) {
        throw new ResponseError("Nu puteți muta ofertele și lucrările în aceeași temă. ", "SAME_IDS", 401);
    }

    const moveTopic = await Topic.findOne({ where: { id: moveId } });
    if(!moveTopic) {
        throw new ResponseError("Tema pentru mutare nu există", "BAD_MOVE_ID", 401);
    }
    let isExternalTransaction = false;
    if(transaction) {
        isExternalTransaction = true;
    } else {
        transaction = await sequelize.transaction();
    }
    try {
        // Update offer and paper topics in bulk using manual SQL query since sequelize doen't have this feature
        // First we need to get the offers and papers that have the moveId already (we will exclude them)
        // Pay attention to escapes since not having them can cause SQL injections!!!
        let [results, _] = await sequelize.query(`SELECT offerId FROM OfferTopics WHERE topicId = ${sequelize.escape(moveId)};`);
        let excludedOfferIds = results.map(result => (result as any).offerId).join(',') || 0;
        await sequelize.query(`
            UPDATE OfferTopics SET topicId = ${sequelize.escape(moveId)}
            WHERE topicId = ${sequelize.escape(id)}
            AND offerId NOT IN (${excludedOfferIds});`,
            { transaction });
        [results, _] = await sequelize.query(`SELECT paperId FROM paperTopics WHERE topicId = ${sequelize.escape(moveId)};`);
        let excludedPaperIds = results.map(result => (result as any).paperId).join(',') || 0;
        await sequelize.query(`
            UPDATE paperTopics SET topicId = ${sequelize.escape(moveId)}
            WHERE topicId = ${sequelize.escape(id)}
            AND paperId NOT IN (${excludedPaperIds});`,
            { transaction });
        await Topic.destroy({ where: { id }, transaction });
        if(!isExternalTransaction) {
            await transaction.commit();
        }
        return { success: true }
    } catch(err) {
        console.log(err)
        if(!isExternalTransaction) {
            await transaction.rollback();
        }
        throw new ResponseError("A apărut o eroare. Contactați administratorul.", "INTERNAL_ERROR", 501)
    }
}

export const bulkDeleteTopics = async (ids: number[], moveId: number) => {
    const transaction = await sequelize.transaction();
    try {
        for(let i = 0; i < ids.length; i++) {
            await deleteTopic(ids[i], moveId, transaction);
        }
        await transaction.commit();
        return { success: true };
    } catch(err) {
        await transaction.rollback();
        throw err;
    }
};

// COMMITTEES

export const getCommittees = async () => {
    let committees = await Committee.findAll();
    return JSON.parse(JSON.stringify(committees)).map(committee=> {
        committee.members = committee.members.map(member => {
            member.teacherId = member.id
            member.role = member.committeeMember.role;
            return member;
        })
        return committee;
    });
}

// Get Committee by ID
export const getCommittee = async (id: number) => {
    let committee = await Committee.findOne({ where: { id } });
    if(!committee) {
        return null;
    }
    let resp: any = JSON.parse(JSON.stringify(committee));
    resp.members = resp.members.map(member => {
        let parsedMember: any = { ...member }
        parsedMember.teacherId = member.id
        parsedMember.role = member.committeeMember.role;
        return parsedMember;
    });
    console.log(resp)
    return resp;
}

// Helper function to check whether the committee is well defined
const checkCommitteeComponence = (members) => {
    try {
        const presidentNumber = members.filter(member => member.role == 'president').length;
        const secretaryNumber = members.filter(member => member.role == 'secretary').length;
        const memberNumber = members.filter(member => member.role == 'member').length;
        if(presidentNumber != 1 || secretaryNumber != 1 || memberNumber < 2) {
            throw "WRONG_COMMITTEE_COMPONENCE";
        }
    } catch(err) {
        if(err == "WRONG_COMMITTEE_COMPONENCE") {
            throw err;
        }
        throw "BAD_REQUEST";
    }
}

const _checkDomains = (domains: Domain[]) => {
    if(domains.length == 0) {
        throw new ResponseError('Comisia trebuie să aibă domenii.');
    } else {
        const sameType = domains.map(domain => domain.type).every(domainType => domainType == domains[0].type);
        if(!sameType) {
            throw new ResponseError('Domeniile comisiei trebuie să fie de același tip.');
        }
    }
}

export const addCommittee = async (name, domainsIds, members) => {
    // Will throw if the committee is badly formed
    checkCommitteeComponence(members);

    const transaction = await sequelize.transaction();
    try {
        const committee = await Committee.create({ name }, { transaction });
        const domains = await Domain.findAll({ where: { // get domains from ids
            id: {
                [Op.in]: domainsIds
            }
        }});
        _checkDomains(domains);
        await committee.setDomains(domains, { transaction }); // set domains
        let committeeMembers = members.map(member => { // add the committee id
            return { ...member, committeeId: committee.id }
        });
        await CommitteeMember.bulkCreate(committeeMembers, { transaction });
        await transaction.commit();
    } catch(err) {
        console.log(err)
        await transaction.rollback();
        throw "VALIDATION_ERROR";
    }
}

export const editCommittee = async (id, name, domainsIds, members) => {
    // Will throw if the committee is badly formed
    checkCommitteeComponence(members);
    // Find the old committee by ID
    const oldCommittee = await Committee.findOne({ where: { id } });
    // If there is no committee to edit, throw
    if(!oldCommittee) {
        throw "BAD_REQUEST";
    }
    const transaction = await sequelize.transaction(); // init a transaction
    try {
        oldCommittee.name = name;
        await oldCommittee.save({ transaction });
        const domains = await Domain.findAll({ where: { // get domains from ids
            id: {
                [Op.in]: domainsIds
            }
        }});
        _checkDomains(domains);
        await oldCommittee.setDomains(domains, { transaction }); // set domains
        await oldCommittee.setMembers([], { transaction }); // remove all the members in order to insert in bulk
        let committeeMembers = members.map(member => { // add the committee id
            return { ...member, committeeId: oldCommittee.id }
        });
        await CommitteeMember.bulkCreate(committeeMembers, { transaction });
        await transaction.commit();

    } catch (err) {
        console.log(err)
        await transaction.rollback();
        throw "BAD_REQUEST";
    }
}

export const deleteCommittee = (id) => {
    return Committee.destroy({ where: {id } });
}

export const setCommitteePapers = async (id: number, paperIds: number[]) => {
    const committee = await Committee.findOne({ where: { id } }); // get committee
    if(!committee) {
        throw "BAD_REQUEST";
    }
    const memberIds = committee.members.map(m => m.id); // get member IDs
    const isMasterCommittee = committee.domains.some(domain => domain.type == 'master');
    const papers = await Paper.findAll({ where: {
        id: {
            [Op.in]: paperIds
        }
    }}); // find all papers and check if the coordinating teacher is in committee
    papers.forEach(paper => {
        if(!isMasterCommittee && memberIds.includes(paper.teacherId)) {
            throw new ResponseError(`Lucrarea "${paper.title}" nu poate fi atribuită, deoarece profesorul coordonator face parte din comisie.`);
        }
        if(!paper.submitted || (paper.isValid != null && !paper.isValid)) {
            throw new ResponseError(`Lucrarea "${paper.title}" nu poate fi atribuită, deoarece este invalidă.`);
        }
    });
    return committee.setPapers(papers);
}

export const autoAssignCommitteePapers = () => {
    return autoAssignPapers();
}

export const generateCommitteeCompositions = () => {
    return DocumentController.generateCommitteeCompositions();
}

export const generateCommitteeStudentsExcel = () => {
    return DocumentController.generateCommitteeStudentsExcel();
}

export const generateCommitteeStudents = () => {
    return DocumentController.generateCommitteeStudents();
}

// PAPERS

export interface GetPapersFilter {
    /** If paper is assigned to any committee */
    assigned?: boolean;
    /** ID of committee where the paper has been assigned */
    assignedTo?: number;
    /** ID of committee that can take the papers for grading. */
    forCommittee?: number;
    /** If papers must be valid. */
    isValid?: boolean;
    /** If papers must not be valid. */
    isNotValid?: boolean;
    /** If papers must be submitted. */
    submitted?: boolean;
    /** Paper type */
    type?: PaperType;
    /** Student domain */
    domainId?: number;
    /** Student study form */
    studyForm?: StudyForm;
    /** Paper title */
    title?: string;
}

export const getPapers = async (sort?: string, order?: SortOrder, filter?: GetPapersFilter,
    page?: number, pageSize?: number, minified?: boolean) => {
    let sortArray: OrderItem = ['id', 'ASC']
    if (['id', 'title', 'type', 'committeeId'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        sortArray = [sort, order];
    }

    let pagination: Pagination = {}
    if(page != undefined) {
        pagination.limit = pageSize;
        pagination.offset = page * pageSize;
    }
    let where: WhereOptions<Paper> = { };
    if(filter?.assigned != null) {
        where.committeeId = filter.assigned ? { [Op.ne]: null } : null;
    }
    if(filter?.assignedTo != null) {
        where.committeeId = filter.assignedTo;
    }
    if(filter?.isValid != null) {
        where.isValid = filter.isValid;
    }
    if(filter?.isNotValid != null) {
        if(filter?.isValid == false && filter?.isNotValid == false) {
            where.isValid = null;
        } else {
            where.isValid = filter.isNotValid ? false : { [Op.or]: [null, true] };
        }
    }
    if(filter.type) {
        where.type = filter.type;
    }
    if(filter.title) {
        where.title = { [Op.substring]: filter.title };
    }
    where.submitted = true;
    if(filter?.submitted != null) {
        where.submitted = filter.submitted;
    }
    let studentWhere = {};
    if(filter.forCommittee != null) {
        const committee = await Committee.findOne({ 
            where: { id: filter.forCommittee },
            include: Committee.associations.domains
        });
        if(!committee) {
            throw "BAD_REQUEST";
        }
        const committeeDomainIds = committee.domains.map(domain => domain.id);
        studentWhere = {
            domainId: {
                [Op.in]: committeeDomainIds
            }
        }
    }

    if(filter.domainId != null) {
        studentWhere = {...studentWhere, domainId: filter.domainId };
    }

    if(filter.studyForm != null) {
        studentWhere = {...studentWhere, studyForm: filter.studyForm };
    }

    let count = await Paper.count({
        where,
        include: [
            {
                association: Paper.associations.student,
                where: studentWhere,
                required: true
            }
        ]
    });

    let scopes = ['student', 'teacher', 'topics'];
    if(!minified) {
        scopes.push('documents');
        scopes.push('committee');
        scopes.push('grades');
    }

    let rows = await Paper.scope(scopes).findAll({
        ...pagination,
        where,
        order: [sortArray],
        include: [
            {
                association: Paper.associations.student,
                where: studentWhere,
                required: true
            }
        ]
    });
    const sessionSettings = await SessionSettings.findOne();
    rows = await Promise.all(JSON.parse(JSON.stringify(rows)).map(async paper  => {
        let newPaper = JSON.parse(JSON.stringify(paper));
        newPaper.student = { ...paper.student.user, generalAverage: paper.student.generalAverage };
        newPaper.teacher = paper.teacher.user;
        if(!minified) {
            newPaper.requiredDocuments = await DocumentController.getPaperRequiredDocuments(paper.id, sessionSettings);
        }
        return newPaper;
    }))
    return { count, rows };
}

const checkRequiredDocuments = (requiredDocs: PaperRequiredDocument[], documents: Document[]): boolean => {
    try {
        requiredDocs.forEach(requiredDoc => {
            let requiredTypes = Object.keys(requiredDoc.types);
            requiredTypes.forEach(requiredType => {
                let document = documents.find(doc => doc.name == requiredDoc.name && doc.type == requiredType);
                if(!document) {
                    throw "missing_doc";
                }
            });
        });
        return true;
    } catch(_) {
        return false;
    }
}

/** Validate/Invalidate a paper by its ID. */
export const validatePaper = async (paperId: number, validate: boolean, generalAverage: number) => {
    const paper = await Paper.scope(['documents', 'student', 'teacher']).findOne({
        include: [
            {
                association: Paper.associations.student,
                include: [StudentExtraData, Domain, Specialization ]
            }
        ],
        where: { id: paperId }
    });
    if(!paper) {
        throw "NOT_FOUND";
    }
    if(validate && (!generalAverage || generalAverage < 1 || generalAverage > 10)) {
        throw new ResponseError("Media generală este invalidă.", "GENERAL_AVERAGE_INVALID");
    }
    if(paper.isValid != null) {
        throw "ALREADY_VALIDATED";
    }
    if(!paper.submitted) {
        throw "PAPER_NOT_SUBMITTED";
    }
    paper.isValid = validate;
    if(validate) {
        const requiredDocs = (await DocumentController.getPaperRequiredDocuments(paperId, null))
            .filter(doc => doc.uploadBy == 'student');
        if(!checkRequiredDocuments(requiredDocs, paper.documents)) {
            throw "MISSING_DOCUMENTS"
        }
    } else {
        paper.committeeId = null;
    }
    if(validate) {
        paper.student.generalAverage = generalAverage;
        const transaction = await sequelize.transaction();
        try {
            await paper.save({ transaction} );
            await paper.student.save({ transaction });
            const sessionSettings = SessionSettings.findOne();
            let data = {
                ...copyObject(paper.student),
                extra: StudentExtraData.findOne({ where: { studentId: paper.student.id } }),
                paper: copyObject(paper),
                sessionSettings: copyObject(sessionSettings)
            }
            const doc = await Document.findOne({ where: { paperId: paper.id, name: 'sign_up_form', type: 'signed' }, transaction });
            let signUpFormBuffer = await DocumentController.generateDocument('sign_up_form', data);  // generate PDF
            fs.writeFileSync(DocumentController.getStoragePath(`${doc.id}.pdf`), signUpFormBuffer);
            await transaction.commit();
        } catch(err) {
            await transaction.rollback();
            throw err;
        }
    } else {
        await paper.save();
    }
    return true;
}

export const undoPaperValidation = async (paperId: number) => {
    const paper = await Paper.findOne({ where: { id: paperId } });
    if(!paper) {
        throw "NOT_FOUND";
    }
    if(paper.isValid == null) {
        throw "BAD_REQUEST";
    }
    paper.isValid = null;
    await paper.save();
    return true;
}

// SESSION SETTINGS

export const changeSessionSettings = async (settings) => {
    // Get the old settings
    let oldSettings = await SessionSettings.findOne();
    // If settings are set, do update query
    if(oldSettings) {
        return SessionSettings.update(settings, { where: { lock: 'X' } });
    } else { // else do create query
        return SessionSettings.create(settings)
    }
}

export const beginNewSession = async (user: User, password: string) => {
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        throw new ResponseError("Parolă incorectă.", "WRONG_PASSWORD", 403);
    }
    const transaction = await sequelize.transaction();
    try {
        await Offer.destroy({ where: { id: { [Op.ne]: null } }, transaction });
        await Committee.destroy({ where: { id: { [Op.ne]: null } }, transaction });
        await User.destroy({ where: { type: 'student' }, transaction });
        let sessionName = 'Sesiune nouă';
        let allowGrading = false;
        await SessionSettings.update({ sessionName, allowGrading }, { where: { lock: 'X' }, transaction });
        await transaction.commit();
        return SessionSettings.findOne();
    } catch(err) {
        console.log(err)
        await transaction.rollback();
        throw new ResponseError("A apărut o eroare. Contactați administratorul.", "INTERNAL_ERROR", 500);
    }
}

const literals = {
    DOMAIN_STUDENT_NUMBER: `(
        SELECT COUNT(student.id)
        FROM students AS student
        WHERE student.domainId = domain.id
    )`,
    DOMAIN_OFFER_NUMBER: `(
        SELECT COUNT(offer.id)
        FROM offers AS offer
        WHERE offer.domainId = domain.id
    )`
}