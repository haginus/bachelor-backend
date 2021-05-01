import { Student, User, Domain, Specialization, ActivationToken, Teacher, Topic, Offer, SessionSettings, Committee, CommitteeMember, sequelize, Paper, Document } from "../models/models";
import * as UserController from './user.controller';
import * as DocumentController from './document.controller';
import * as Mailer from '../alerts/mailer';
import crypto from 'crypto';
import { config } from "../config/config";
import { Model, Op, OrderItem, Sequelize } from "sequelize";
import csv from 'csv-parser';
import fs from 'fs';
import { PaperRequiredDocument } from "../paper-required-documents";
var stream = require('stream');


// Students

type SortOrder = 'ASC' | 'DESC';
type Pagination = { limit?: number, offset?: number };

export const getStudents = async (sort, order, filter, page, pageSize) => {
    const limit = pageSize;
    const offset = page * pageSize;
    if (limit <= 0 || offset < 0) {
        throw "INVALID_PARAMETERS";
    }

    let sortArray: OrderItem = ['id', 'ASC']
    if (['id', 'firstName', 'lastName', 'CNP', 'email', 'group', 'domain'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        if (sort == 'group')
            sortArray = ['student', 'group', order];
        else if (sort == 'domain')
            sortArray = ['student', 'domain', 'name', order];
        else
            sortArray = [sort, order];
    }

    let query = await User.findAndCountAll({
        //where,
        attributes: { exclude: ['password'] },
        include: [
            {
                model: sequelize.model('student'), required: true,
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
        let student = await Student.create({ group, identificationCode, promotion, studyForm, fundingForm, matriculationYear,
            domainId, specializationId, userId: user.id }, { transaction });
        let token = crypto.randomBytes(64).toString('hex'); // generate activation token
        let activationToken = await ActivationToken.create({ token, userId: user.id }, { transaction }); // insert in db
        await Mailer.sendWelcomeEmail(user, activationToken.token); // send welcome mail
        await transaction.commit(); // commit changes
        return UserController.getUserData(user.id); // return user data
    } catch (err) {
        console.log(err);
        await transaction.rollback(); // if anything goes wrong, rollback
        throw "VALIDATION_ERROR";
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

export const deleteUser = async (id) => {
    let result = await User.destroy({ where: { id } });
    return result;
}

export const addStudentBulk = async (file) => {
    /*
    let users = []
    await new Promise((resolve, reject) => {
        try {
            var bufferStream = new stream.PassThrough();
            bufferStream.end(file);
            bufferStream
                .pipe(csv(["firstName", "lastName", "CNP", "email", "domain", "domain_type", "group"]))
                .on('data', (data) => users.push(data))
                .on('end', () => {
                    resolve(null);
                });
        } catch (err) {
            console.log(err)
            throw "INVALID_CSV";
        }
    });
    let domains = users.map(user => { return { name: user.domain, type: user.domain_type } });
    let domainsDict = {};
    for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        if (domainsDict[domain.name]) {
            if (domainsDict[domain.name] != domain.type) {
                throw "CONFLICTING_DOMAINS";
            }
        } else {
            domainsDict[domain.name] = domain.type;
        }
    }
    let uniqueDomains = [];
    for (const [key, value] of Object.entries(domainsDict)) {
        uniqueDomains.push({ name: key, type: value });
    }

    const dbDomains = await Domain.findAll();
    dbDomains.forEach(domain => {
        if (domainsDict[domain.name]) {
            if (domainsDict[domain.name] != domain.type)
                throw "CONFLICTING_DOMAINS";
            uniqueDomains = uniqueDomains.filter(v => v.name != domain.name);
            // set domain id for user
            usersInDomain = users.filter(u => u.domain == domain.name).map(u => {
                return { ...u, domainId: domain.id };
            })
            users = users.filter(u => u.domain != domain.name).concat(usersInDomain);
        }
    });

    for (let i = 0; i < uniqueDomains.length; i++) {
        const domain = uniqueDomains[i];
        domainDb = await Domain.create(domain);
        usersInDomain = users.filter(u => u.domain == domain.name).map(u => {
            return { ...u, domainId: domainDb.id };
        })
        users = users.filter(u => u.domain != domain.name).concat(usersInDomain);
    }

    let promises = []
    users.forEach(user => {
        const { firstName, lastName, CNP, email, group, domainId } = user;
        promises.push(this.addStudent(firstName, lastName, CNP, email, group, domainId));
    });

    let results = await Promise.allSettled(promises);

    let addedDomains = uniqueDomains.length;
    let totalStudents = users.length;

    let response = { students: [], addedDomains, totalStudents, addedStudents: 0 };

    results.forEach(result => {
        if (result.status == 'fulfilled') {
            response.addedStudents++;
            response.students.push(result.value);
        }
    });

    return response;
    */
   return null;
}

// Teachers

export const getTeachers = async (sort: string, order: 'ASC' | 'DESC', filter, page: number, pageSize: number) => {
    const limit = pageSize;
    const offset = page * pageSize;
    if (limit <= 0 || offset < 0) {
        throw "INVALID_PARAMETERS";
    }

    let sortArray: OrderItem = [ 'id', 'ASC'];
    if (['id', 'firstName', 'lastName', 'CNP', 'email'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        sortArray = [ 'id', 'ASC'];
    }

    let query = await User.findAndCountAll({
        where: { type: "teacher" },
        include: sequelize.model('teacher'),
        attributes: { exclude: ['password'] },
        limit,
        offset,
        order: [sortArray]
    });
    return query;
}

export const addTeacher = async (title: string, firstName: string, lastName: string, CNP: string, email: string) => {
    try {
        let user = await User.create({ firstName, lastName, CNP, email, type: 'teacher' });
        let teacher = await Teacher.create({ userId: user.id });
        let token = crypto.randomBytes(64).toString('hex');
        let activationToken = await ActivationToken.create({ token, userId: user.id });
        Mailer.sendWelcomeEmail(user, activationToken.token);
        return UserController.getUserData(user.id);
    } catch (err) {
        throw "VALIDATION_ERROR";
    }
}

export const editTeacher = async (id: number, title: string, firstName: string, lastName: string, CNP: string) => {
    let userUpdate = await User.update({ title, firstName, lastName, CNP }, {
        where: { id }
    });
    return UserController.getUserData(id);
}

export const addTeacherBulk = async (file) => {
    let users = []
    await new Promise((resolve, reject) => {
        try {
            var bufferStream = new stream.PassThrough();
            bufferStream.end(file);
            bufferStream
                .pipe(csv(["firstName", "lastName", "CNP", "email"]))
                .on('data', (data) => users.push(data))
                .on('end', () => {
                    resolve(null);
                });
        } catch (err) {
            console.log(err)
            throw "INVALID_CSV";
        }
    });

    let promises = []
    users.forEach(user => {
        const { firstName, lastName, CNP, email } = user;
        promises.push(addTeacher(null, firstName, lastName, CNP, email));
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

export const getDomains = () => {
    return Domain.scope("specializations").findAll();
}

export const getDomainsExtra = () => {
    return Domain.scope("specializations").findAll({
        attributes: {
            include: [
                [literals.DOMAIN_STUDENT_NUMBER, 'studentNumber'],
                [literals.DOMAIN_STUDENT_NUMBER, 'offerNumber']
            ]
        }
    })
}

export const getDomain = (id) => {
    return Domain.scope("specializations").findOne({
        attributes: {
            include: [
                [literals.DOMAIN_STUDENT_NUMBER, 'studentNumber'],
                [literals.DOMAIN_STUDENT_NUMBER, 'offerNumber']
            ]
        },
        where: { id }
    })
}

export const addDomain = (name, type, specializations) => {
    return Domain.create(
        { name, type, specializations },
        {
            include: [ sequelize.model('specialization') ]
        }
    );
}

export const editDomain = async (id, name, type, specializations) => {
    const oldDomain = await getDomain(id); // get old domain data
    if(!oldDomain) {
        throw "BAD_REQUEST";
    }
    const specIds = oldDomain.specializations.map(spec => spec.id);
    const transaction = await sequelize.transaction(); // start transaction
    try {
        await Domain.update({ name, type }, { where: { id }, transaction }); // update domain data
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

export const deleteTopic = async (id, moveId) => {
    if(id == moveId) {
        throw "BAD_REQUEST"
    }

    const moveTopic = await Topic.findOne({ where: { id: moveId } });
    if(!moveTopic) {
        throw "BAD_REQUEST"
    }

    //await Offer.update({ topicId: moveId }, { where: { topicId: id } });
    return Topic.destroy({ where: id });
}

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

export const setCommitteePapers = async (id, paperIds) => {
    const committee = await Committee.findOne({ where: { id } }); // get committee
    if(!committee) {
        throw "BAD_REQUEST";
    }
    const memberIds = committee.members.map(m => m.id); // get member IDs
    const papers = await Paper.findAll({ where: {
        id: {
            [Op.in]: paperIds
        }
    }}); // find all papers and check if the coordinating teacher is in committee
    papers.forEach(paper => {
        if(memberIds.includes(paper.teacherId)) {
            throw "MEMBER_PAPER_INCOMPATIBILITY";
        }
    });
    return committee.setPapers(papers);
}

export const generateCommitteeCompositions = () => {
    return DocumentController.generateCommitteeCompositions();
}

// PAPERS

export interface GetPapersFilter {
    /** If paper is assigned to any committee */
    assigned: boolean;
    /** ID of committee where the paper has been assigned */
    assignedTo: number
}

export const getPapers = async (sort?: string, order?: SortOrder, filter?: GetPapersFilter,
    page?: number, pageSize?: number, minified?: boolean) => {
    let sortArray: OrderItem = ['id', 'ASC']
    if (['id', 'title', 'type'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        sortArray = [sort, order];
    }

    let pagination: Pagination = {}
    if(page != undefined) {
        pagination.limit = pageSize;
        pagination.offset = page * pageSize;
    }
    let where: any = { };
    if(filter?.assigned != null) {
        where.committeeId = filter.assigned ? { [Op.ne]: null } : null;
    }
    if(filter?.assignedTo != null) {
        where.committeeId = filter.assignedTo;
    }

    let count = await Paper.count({where});

    let scopes = ['student', 'teacher'];
    if(!minified) {
        scopes.push('documents');
        scopes.push('committee');
        scopes.push('grades');
    }

    let rows = await Paper.scope(scopes).findAll({
        ...pagination,
        where,
        order: [sortArray]
    });
    const sessionSettings = await SessionSettings.findOne();
    rows = await Promise.all(JSON.parse(JSON.stringify(rows)).map(async paper  => {
        let newPaper = JSON.parse(JSON.stringify(paper));
        newPaper.student = paper.student.user;
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
export const validatePaper = async (paperId: number, validate: boolean) => {
    const paper = await Paper.scope('documents').findOne({ where: { id: paperId } });
    if(!paper) {
        throw "NOT_FOUND";
    }
    if(paper.isValid != null) {
        throw "ALREADY_VALIDATED";
    }
    paper.isValid = validate;
    if(validate) {
        const requiredDocs = (await DocumentController.getPaperRequiredDocuments(paperId, null))
            .filter(doc => doc.uploadBy == 'student');
        if(!checkRequiredDocuments(requiredDocs, paper.documents)) {
            throw "MISSING_DOCUMENTS"
        }
    }
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