"use strict"
import { User, Teacher, Offer, Paper, Document, Domain, Topic, Application, Student, sequelize, SessionSettings, StudentExtraData, Specialization, DocumentType, UploadPerspective } from "../models/models";
import * as UserController from './user.controller';
import * as DocumentController from './/document.controller';
import { Model, Op, Sequelize } from "sequelize";
import * as Mailer from "../alerts/mailer";
import { UploadedFile } from "express-fileupload";


export const validateTeacher = async (uid) => {
    return UserController.validateUser(uid);
}

export const getTeacherByUserId = (uid) => {
    return Teacher.findOne({ where: { userId: uid } });
}

export const getOffers = async (uid) => {
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
                model: Domain as typeof Model,
            },
            {
                model: Topic as typeof Model,
                through: {
                    attributes: []
                }
            }
        ]
    })
    return offers
}

export const editOffer = async (uid, offerId, domainId, topicIds, limit) => {
    let offer = await Offer.findOne({
        where: { id: offerId },
        attributes: {
            include: [
                [literals.countOfferAcceptedApplications, "takenPlaces"]
            ]
        }
    });

    const teacher = await getTeacherByUserId(uid);

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

export const addOffer = async (uid, domainId, topicIds, limit) => {

    if(limit < 1) {
        throw "LIMIT_LOWER_THAN_1";
    }

    const teacher = await getTeacherByUserId(uid);

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

export const getApplications = async (uid, offerId, state) => {
    const teacher = await getTeacherByUserId(uid);
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
                model: Offer as typeof Model,
                where: {
                    teacherId: teacher.id,
                    ...offerIdFilter
                },
                include: [
                    {
                        model: Domain as typeof Model
                    },
                    {
                        model: Topic as typeof Model
                    }
                ],
                attributes: {
                    include: [
                        [literals.countOfferAcceptedApplications, 'takenPlaces']
                    ]
                }
            },
            {
                model: Student as typeof Model,
                include: [{
                    model: User as typeof Model,
                    attributes: ["id", "firstName", "lastName"]
                }]
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

export const getApplication = (id) => {
    return Application.findOne({ 
        where: { id },
        include: [{
            model: Offer as typeof Model
        },
        {
            model: Student as typeof Model,
            include: [
                {
                    model: User as typeof Model,
                    attributes: ["id", "firstName", "lastName", "email"]
                }
            ]
        }]
    });
}

export const declineApplication = async (user, applicationId) => {
    const teacher = await getTeacherByUserId(user.id);

    let application = await getApplication(applicationId);
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

export const acceptApplication = async (user, applicationId) => {
    const teacher = await getTeacherByUserId(user.id);

    let application = await getApplication(applicationId);
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

export const getDomains = () => {
    return Domain.findAll();
}

export const getStudentPapers = async (user: User) => {
    let papers = await user.teacher.getPapers({
        scope: ['committee'],
        include: [
            {
                model: Document as typeof Model,
                required: false,
                where: { category: 'paper_files' }
            },
            {
                required: true,
                model: Student as typeof Model,
                include: [
                    User.scope("min"),
                    Domain as typeof Model,
                    Specialization as typeof Model
                ]
            }
        ]
    });

    return Promise.all(JSON.parse(JSON.stringify(papers)).map(async paper => {
        let required = await DocumentController.getPaperRequiredDocuments(paper.id);
        paper.student = { ...paper.student.user };
        paper.requiredDocuments = required.filter(doc => doc.category == 'paper_files');
        return paper;
    }));
}

export const uploadPaperDocument = (user: User, documentFile: UploadedFile, name: string, type: DocumentType,
    perspective: UploadPerspective, paperId: number) => {
    return DocumentController.uploadPaperDocument(user, documentFile, name, type, perspective, paperId);
}

/** Remove association with a student by deleting their paper and allowing them to look for other teacher. */
export const removePaper = async (user: User, paperId: number): Promise<boolean> => {
    const paper = await Paper.findOne({ where: { id: paperId } });
    if(!paper) {
        throw "PAPER_NOT_FOUND";
    }
    if(paper.teacherId != user.teacher.id) {
        throw "UNAUTHORIZED";
    }
    const studentId = paper.studentId;
    const transaction = await sequelize.transaction();
    try { 
        await StudentExtraData.destroy({ where: { studentId }, transaction });
        await Paper.destroy({ where: { studentId }, transaction });
        // Change application status to declined so that student can't apply to the same offer again
        await Application.update({ accepted: false }, { where: { studentId }, transaction });
        // Get student data to send email
        let student = await User.findOne({
            include: [{ association: User.associations.student, required: true, where: { id: studentId } }]
        })
        Mailer.sendRemovedPaperNotice(student, user);
        await transaction.commit();
    } catch(err) {
        await transaction.rollback();
        throw "INTERNAL_ERROR";
    }
    return true;
}

export const getCommittees = async (user: User) => {
    const committees = await user.teacher.getCommittees();
    return JSON.parse(JSON.stringify(committees)).map(committee => {
        committee.members = committee.members.map(member => {
            member.teacherId = member.id
            member.role = member.committeeMember.role;
            return member;
        })
        return committee;
    });
}


const literals = {
    countOfferAcceptedApplications: Sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS application
        WHERE
            application.offerId = \`offer\`.id
            AND
            application.accepted = 1
    )`),
    countOfferApplications: Sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS application
        WHERE
            application.offerId = \`offer\`.id
            AND
            application.accepted IS NULL
    )`)
}