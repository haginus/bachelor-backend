const { Student, User, Domain, ActivationToken } = require("../models/models.js");
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
        include: [{ model: Student, required: true, include: [{ model: Domain }] }],
        limit,
        offset,
        order: sortArray
    });
    return query;
}

exports.addStudent = async (firstName, lastName, CNP, email, group, domainId) => {
    let domain = await Domain.findOne({ where: { id: domainId } });
    if (!domain) {
        throw "DOMAIN_NOT_FOUND";
    }
    try {
        let user = await User.create({ firstName, lastName, CNP, email, type: 'student' });
        let student = await Student.create({ group });
        await student.setDomain(domain);
        await student.setUser(user);
        let token = crypto.randomBytes(64).toString('hex');
        let activationToken = await ActivationToken.create({ token, userId: user.id });
        Mailer.sendWelcomeEmail(user, activationToken.token);
        return UserController.getUserData(user.id);
    } catch (err) {
        throw "VALIDATION_ERROR";
    }
}

exports.editStudent = async (id, firstName, lastName, CNP, group, domainId) => {
    let domain = await Domain.findOne({ where: { id: domainId } });
    if (!domain) {
        throw "DOMAIN_NOT_FOUND";
    }
    let userUpdate = await User.update({ firstName, lastName, CNP }, {
        where: { id }
    });
    let studentUpdate = await Student.update({ group, domainId }, {
        where: { userId: id }
    });
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

exports.getDomains = () => {
    return Domain.findAll();
}