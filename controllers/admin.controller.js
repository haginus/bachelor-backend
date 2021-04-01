const { Student, User, Domain, Specialization, ActivationToken, Teacher, Topic, Offer, SessionSettings, sequelize } = require("../models/models.js");
const UserController = require('./user.controller')
const Mailer = require('../alerts/mailer')
const crypto = require('crypto');
const { config } = require("../config/config");
const { Op } = require("sequelize");
const csv = require('csv-parser')
const fs = require('fs')
var stream = require('stream');


// Students

exports.getStudents = async (sort, order, filter, page, pageSize) => {
    const limit = pageSize;
    const offset = page * pageSize;
    if (limit <= 0 || offset < 0) {
        throw "INVALID_PARAMETERS";
    }

    let sortArray = [['id', 'ASC']]
    if (['id', 'firstName', 'lastName', 'CNP', 'email', 'group', 'domain'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        if (sort == 'group')
            sortArray = [['student', 'group', order]];
        else if (sort == 'domain')
            sortArray = [['student', 'domain', 'name', order]];
        else
            sortArray = [[sort, order]];
    }

    let query = await User.findAndCountAll({
        //where,
        attributes: { exclude: ['password'] },
        include: [{ model: Student, required: true, include: [{ model: Domain }, { model: Specialization }] }],
        limit,
        offset,
        order: sortArray
    });
    return query;
}

exports.addStudent = async (firstName, lastName, CNP, email, group, specializationId, identificationCode, promotion,
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

exports.editStudent = async (id, firstName, lastName, CNP, group, specializationId, identificationCode, promotion,
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

exports.deleteUser = async (id) => {
    let result = await User.destroy({ where: { id } });
    return result;
}

exports.addStudentBulk = async (file) => {
    let users = []
    await new Promise((resolve, reject) => {
        try {
            var bufferStream = new stream.PassThrough();
            bufferStream.end(file);
            bufferStream
                .pipe(csv(["firstName", "lastName", "CNP", "email", "domain", "domain_type", "group"]))
                .on('data', (data) => users.push(data))
                .on('end', () => {
                    resolve();
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
}

// Teachers

exports.getTeachers = async (sort, order, filter, page, pageSize) => {
    const limit = pageSize;
    const offset = page * pageSize;
    if (limit <= 0 || offset < 0) {
        throw "INVALID_PARAMETERS";
    }

    let sortArray = [['id', 'ASC']]
    if (['id', 'firstName', 'lastName', 'CNP', 'email'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        sortArray = [[sort, order]];
    }

    let query = await User.findAndCountAll({
        where: { type: "teacher" },
        attributes: { exclude: ['password'] },
        limit,
        offset,
        order: sortArray
    });
    return query;
}

exports.addTeacher = async (firstName, lastName, CNP, email) => {
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

exports.editTeacher = async (id, firstName, lastName, CNP) => {
    let userUpdate = await User.update({ firstName, lastName, CNP }, {
        where: { id }
    });
    return UserController.getUserData(id);
}

exports.addTeacherBulk = async (file) => {
    let users = []
    await new Promise((resolve, reject) => {
        try {
            var bufferStream = new stream.PassThrough();
            bufferStream.end(file);
            bufferStream
                .pipe(csv(["firstName", "lastName", "CNP", "email"]))
                .on('data', (data) => users.push(data))
                .on('end', () => {
                    resolve();
                });
        } catch (err) {
            console.log(err)
            throw "INVALID_CSV";
        }
    });

    let promises = []
    users.forEach(user => {
        const { firstName, lastName, CNP, email } = user;
        promises.push(this.addTeacher(firstName, lastName, CNP, email));
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

exports.getDomains = () => {
    return Domain.scope("specializations").findAll();
}

exports.getDomainsExtra = () => {
    return Domain.scope("specializations").findAll({
        attributes: {
            include: [
                [literals.DOMAIN_STUDENT_NUMBER, 'studentNumber'],
                [literals.DOMAIN_STUDENT_NUMBER, 'offerNumber']
            ]
        }
    })
}

exports.getDomain = (id) => {
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

exports.addDomain = (name, type, specializations) => {
    return Domain.create(
        { name, type, specializations },
        {
            include: [ Specialization ]
        }
    );
}

exports.editDomain = async (id, name, type, specializations) => {
    const oldDomain = await this.getDomain(id); // get old domain data
    if(!oldDomain) {
        throw "BAD_REQUEST";
    }
    const specIds = oldDomain.specializations.map(spec => spec.id);
    const transaction = await sequelize.transaction(); // start transaction
    try {
        await Domain.update({ name, type }, { where: { id }, transaction }); // update domain data
        specs = {
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
        for(spec of specs.toEdit) {
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
    return this.getDomain(id);
}

exports.deleteDomain = async (id) => {
    const domain = await this.getDomain(id);
    if(!domain || domain.studentNumber > 0) {
        throw "BAD_REQUEST";
    }
    return Domain.destroy({ where: { id } });
}

// TOPICS

exports.getTopics = async (sort, order, filter, page, pageSize) => {
    const limit = pageSize;
    const offset = page * pageSize;
    if (limit <= 0 || offset < 0) {
        throw "INVALID_PARAMETERS";
    }

    let sortArray = [['id', 'ASC']]
    if (['id', 'name'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
        sortArray = [[sort, order]];
    }

    let query = await Topic.findAndCountAll({
        limit,
        offset,
        order: sortArray
    });
    return query;
}

exports.addTopic = (name) => {
    return Topic.create({ name });
}

exports.editTopic = (id, name) => {
    return Topic.update({ name }, { where: { id } });
}

exports.deleteTopic = async (id, moveId) => {
    if(id == moveId) {
        throw "BAD_REQUEST"
    }

    const moveTopic = await Topic.findOne({ where: { id: moveId } });
    if(!moveTopic) {
        throw "BAD_REQUEST"
    }

    await Offer.update({ topicId: moveId }, { where: { topicId: id } });
    return Topic.destroy({ where: id });
}

// SESSION SETTINGS

exports.changeSessionSettings = async (settings) => {
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