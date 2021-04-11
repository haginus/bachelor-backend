"use strict"
const { User, Teacher, Offer, Paper, Document, Domain, Topic, Application, Student, sequelize, SessionSettings, StudentExtraData, Specialization } = require("../models/models.js");
const UserController = require('./user.controller')
const StudentController = require('./student.controller')
const { Op } = require("sequelize");
const Mailer = require("../alerts/mailer")
const paperRequiredDocuments = require('./../json/paper-required-documents.json')


exports.validateTeacher = async (uid) => {
    return UserController.validateUser(uid);
}

exports.getTeacherByUserId = (uid) => {
    return Teacher.findOne({ where: { userId: uid } });
}

exports.getOffers = async (uid) => {
    const teacher = await Teacher.findOne({ where: { userId: uid } });
    const offers = Offer.findAll({
        where: {
            teacherId: teacher.id
        },
        attributes: {
            include: [
                [ literals.countOfferApplications, "pendingApplications" ],
                [ literals.countOfferAcceptedApplications, "takenPlaces" ],
            ]
        },
        include: [
            {
                model: Domain,
            },
            {
                model: Topic,
                through: {
                    attributes: []
                }
            }
        ]
    })
    return offers
}

exports.editOffer = async (uid, offerId, domainId, topicIds, limit) => {
    let offer = await Offer.findOne({
        where: { id: offerId },
        attributes: {
            include: [
                [literals.countOfferAcceptedApplications, "takenPlaces"]
            ]
        }
    });

    const teacher = await this.getTeacherByUserId(uid);

    if(offer.teacherId != teacher.id) {
        throw "UNAUTHORIZED"
    }

    if(offer.takenPlaces > limit) {
        throw "LIMIT_LOWER_THAN_TAKEN_PLACES"
    }

    let topics = await Topic.findAll({
        where: {
            id: {
                [Op.in]: topicIds
            }
        }
    });

    try {
        offer.domainId = domainId;
        offer.limit = limit;
        await offer.save();
        await offer.setTopics(topics);
    } catch(err) {
        console.log(err)
        throw "VALIDATION_ERROR";
    }
    return offer;
}

exports.addOffer = async (uid, domainId, topicIds, limit) => {

    if(limit < 1) {
        throw "LIMIT_LOWER_THAN_1";
    }

    const teacher = await this.getTeacherByUserId(uid);

    let topics = await Topic.findAll({
        where: {
            id: {
                [Op.in]: topicIds
            }
        }
    });

    try {
        const offer = await Offer.create({ domainId, limit, teacherId: teacher.id });
        await offer.setTopics(topics);
        return offer;
    } catch(err) {
        console.log(err)
        throw "VALIDATION_ERROR";
    }
}

exports.getApplications = async (uid, offerId, state) => {
    const teacher = await this.getTeacherByUserId(uid);
    const offerIdFilter = offerId ? { id: offerId } : {}
    let stateFilter;
    switch(state) {
        case 'accepted':
            stateFilter = { accepted: true }
            break
        case 'declined':
            stateFilter = { accepted: false }
            break
        case 'pending':
            stateFilter = { accepted: null }
            break
        default:
            stateFilter = {}
    }

    let result = await Application.findAll({
        where: {
            ...stateFilter
        },
        include: [
            {
                required: true,
                model: Offer,
                where: {
                    teacherId: teacher.id,
                    ...offerIdFilter
                },
                include: [
                    {
                        model: Domain
                    },
                    {
                        model: Topic
                    }
                ],
                attributes: {
                    include: [
                        [literals.countOfferAcceptedApplications, 'takenPlaces']
                    ]
                }
            },
            {
                model: Student,
                include: {
                    model: User,
                    attributes: ["id", "firstName", "lastName"]
                }
            },
        ],
        order: [
            ['accepted', 'ASC']
        ],
    });

    result = JSON.parse(JSON.stringify(result)).map(application => {
        application.student = application.student.user;
        return application;
    })

    return result;
}

exports.getApplication = (id) => {
    return Application.findOne({ 
        where: { id },
        include: [{
            model: Offer
        },
        {
            model: Student,
            include: [
                {
                    model: User,
                    attributes: ["id", "firstName", "lastName", "email"]
                }
            ]
        }]
    });
}

exports.declineApplication = async (user, applicationId) => {
    const teacher = await this.getTeacherByUserId(user.id);

    let application = await this.getApplication(applicationId);
    if(!application) {
        throw "MISSING_APPLICATION"
    }
    if(application.offer.teacherId != teacher.id) {
        throw "UNAUTHORIZED"
    }

    if(application.accepted != null) {
        throw "NOT_ALLOWED"
    }

    application.accepted = false;

    await application.save();

    Mailer.sendRejectedApplicationEmail(application.student.user, user, application);
    return { success: true }
}

exports.acceptApplication = async (user, applicationId) => {
    const teacher = await this.getTeacherByUserId(user.id);

    let application = await this.getApplication(applicationId);
    if(!application) {
        throw "MISSING_APPLICATION"
    }
    if(application.offer.teacherId != teacher.id) {
        throw "UNAUTHORIZED"
    }

    if(application.accepted != null) {
        throw "NOT_ALLOWED"
    }

    const takenPlaces = await Application.count({
        where: { offerId: application.offerId, accepted: true }
    })

    if(takenPlaces + 1 > application.offer.limit) {
        throw "LIMIT_REACHED"
    }

    application.accepted = true;

    await application.save();

    await Application.destroy({  // remove other student applications
        where: { 
            studentId: application.studentId,
            id: {
                [Op.ne]: applicationId
            }
        }
    });

    const domain = await Domain.findOne({ where: { id: application.student.domainId } }); // get the domain for type

    // CREATE PAPER
    const { title, description, studentId } = application;
    await Paper.create({
        title, description, studentId, teacherId: teacher.id, type: domain.type
    });

    Mailer.sendAcceptedApplicationEmail(application.student.user, user, application);
    return { success: true }
}

exports.getDomains = () => {
    return Domain.findAll();
}

exports.getStudentPapers = async (user) => {
    let papers = await user.teacher.getPapers({
        scope: ['committee'],
        include: [
            {
                model: Document,
                required: false,
                where: { category: 'paper_files' }
            },
            {
                required: true,
                model: Student,
                include: [User.scope("min"), StudentExtraData, Domain, Specialization]
            }
        ]
    });
    const sessionSettings = await SessionSettings.findOne();

    return Promise.all(JSON.parse(JSON.stringify(papers)).map(async paper => {
        // Inverse data in a way that can be used by getPaperRequiredDocuments
        // must be user -> student -> { paper, domain }
        console.log(paper)
        let _paper = JSON.parse(JSON.stringify(paper));
        let user = _paper.student.user;
        delete _paper.student.user;
        user.student = _paper.student;
        delete _paper.student;
        user.student.paper = { ..._paper };
        let required = await StudentController.getPaperRequiredDocuments(user, user.student.StudentExtraDatum, sessionSettings);
        paper.student = { ...paper.student.user };
        paper.requiredDocuments = required.filter(doc => doc.category == 'paper_files');
        return paper;
    }));
}


const literals = {
    countOfferAcceptedApplications: sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS application
        WHERE
            application.offerId = \`offer\`.id
            AND
            application.accepted = 1
    )`),
    countOfferApplications: sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS application
        WHERE
            application.offerId = \`offer\`.id
            AND
            application.accepted IS NULL
    )`)
}