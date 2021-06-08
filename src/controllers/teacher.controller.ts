"use strict"
import { User, Teacher, Offer, Paper, PaperGrade, Document, Domain, Topic, Application, Student, sequelize, SessionSettings, StudentExtraData, Specialization, DocumentType, UploadPerspective, Committee } from "../models/models";
import * as UserController from './user.controller';
import * as DocumentController from './/document.controller';
import { Model, Op, Sequelize, ValidationError } from "sequelize";
import * as Mailer from "../alerts/mailer";
import { UploadedFile } from "express-fileupload";
import { copyObject, ResponseError, ResponseErrorForbidden } from "../util/util";


export const validateTeacher = async (user: User) => {
    user.validated = true;
    await user.save();
    return user;
}

export const getTeacherByUserId = (uid) => {
    return Teacher.findOne({ where: { userId: uid } });
}

export const getOffers = async (user: User) => {
    const teacher = user.teacher;
    const offers = await teacher.getOffers({
        attributes: {
            include: [
                [ literals.countOfferApplications, "pendingApplications" ],
                [ literals.countOfferAcceptedApplications, "takenPlaces" ],
            ]
        },
        include: [
            Offer.associations.domain,
            Offer.associations.topics
        ]
    });
    return offers;
}

export const editOffer = async (user: User, offerId: number, domainId: number,
    topicIds: number[], limit: number) => {
    let offer = await Offer.findByPk(offerId, {
        attributes: {
            include: [
                [literals.countOfferAcceptedApplications, "takenPlaces"]
            ]
        }
    });
    if(!offer) {
        throw new ResponseError('Oferta nu există.');
    }
    if(offer.teacherId != user.teacher.id) {
        throw new ResponseErrorForbidden();
    }
    if(offer.takenPlaces > limit) {
        throw new ResponseErrorForbidden('Nu puteți seta o limită mai mare decât numărul de locuri deja ocupat.',
            'LIMIT_LOWER_THAN_TAKEN_PLACES');
    }
    const transaction = await sequelize.transaction();
    try {
        offer.domainId = domainId;
        offer.limit = limit;
        await offer.save({ transaction });
        await offer.setTopics(topicIds, { transaction });
        await transaction.commit();
        return offer;
    } catch(err) {
        await transaction.rollback();
        if(err instanceof ValidationError) {
            throw new ResponseError('Domeniul sau temele nu există.');
        }
        else throw err;
    }
}

export const addOffer = async (user: User, domainId: number, topicIds: number[], limit: number) => {
    if(limit < 1) {
        throw new ResponseError('Limita nu poate fi mai mică decât 1.', 'LIMIT_LOWER_THAN_1');
    }
    const transaction = await sequelize.transaction();
    try {
        const offer = await Offer.create({ domainId, limit, teacherId: user.teacher.id }, { transaction });
        await offer.setTopics(topicIds, { transaction });
        await transaction.commit();
        return offer;
    } catch(err) {
        await transaction.rollback();
        if(err instanceof ValidationError) {
            throw new ResponseError('Domeniul sau temele nu există.');
        }
        else throw err;
    }
}

export const getApplications = async (user: User, offerId: number, state: string) => {
    const teacher = user.teacher;
    const offerIdFilter = offerId ? { id: offerId } : {}
    let stateFilter: { accepted?: boolean | null };
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
                association: Application.associations.offer,
                where: {
                    teacherId: teacher.id,
                    ...offerIdFilter
                },
                include: [
                    Offer.associations.domain,
                    Offer.associations.topics
                ],
                attributes: {
                    include: [
                        [literals.countOfferAcceptedApplications, 'takenPlaces']
                    ]
                }
            },
            {
                association: Application.associations.student,
                include: [
                    User.scope('min')
                ]
            },
        ],
        order: [
            ['accepted', 'ASC']
        ],
    });

    result = copyObject<any>(result).map(application => {
        application.student = application.student.user;
        return application;
    });

    return result;
}

const getApplication = (id: number) => {
    return Application.findOne({ 
        where: { id },
        include: [
            Application.associations.offer,
            {
                association: Application.associations.student,
                include: [
                    User.scope('min')
                ]
            }
        ]
    });
}

export const declineApplication = async (user: User, applicationId: number) => {
    let application = await getApplication(applicationId);
    if(!application) {
        throw new ResponseError('Cererea nu a fost găsită.', 'MISSING_APPLICATION');
    }
    if(application.offer.teacherId != user.teacher.id) {
        throw new ResponseErrorForbidden();
    }
    if(application.accepted != null) {
        throw new ResponseErrorForbidden();
    }
    application.accepted = false;
    await application.save();
    Mailer.sendRejectedApplicationEmail(application.student.user, user, application);
    return { success: true }
}

export const acceptApplication = async (user: User, applicationId: number) => {
    let application = await getApplication(applicationId);
    if(!application) {
        throw new ResponseError("Cererea nu există.", "MISSING_APPLICATION", 401);
    }
    if(application.offer.teacherId != user.teacher.id) {
        throw new ResponseError("Cererea nu vă aparține.", "UNAUTHORIZED", 403);
    }
    if(application.accepted != null) {
        throw new ResponseError("Cererea a fost deja acceptată sau respinsă.", "NOT_ALLOWED", 401);
    }
    const takenPlaces = await Application.count({
        where: { offerId: application.offerId, accepted: true }
    });

    if(takenPlaces + 1 > application.offer.limit) {
        throw new ResponseError("Limita ofertei a fost deja atinsă.", "LIMIT_REACHED", 403);
    }
    application.accepted = true;
    const transaction = await sequelize.transaction();
    try {
        await application.save({ transaction });
        await Application.destroy({  // remove other student applications
            where: { 
                studentId: application.studentId,
                id: { [Op.ne]: applicationId }
            },
            transaction
        });
        const domain = await Domain.findOne({ where: { id: application.student.domainId } }); // get the domain for type
        // CREATE PAPER
        const { title, description, studentId } = application;
        const paper = await Paper.create({
            title, description, studentId, teacherId: user.teacher.id, type: domain.type
        }, { transaction });
        const topicIds = application.offer.topics.map(topic => topic.id);
        await paper.setTopics(topicIds, { transaction });
        await transaction.commit();
    } catch(err) {
        await transaction.rollback();
        throw err;
    }

    Mailer.sendAcceptedApplicationEmail(application.student.user, user, application);
    return { success: true }
}

export const getDomains = () => {
    return Domain.findAll();
}

export const getStudentPapers = async (user: User) => {
    let papers = await user.teacher.getPapers({
        scope: ['committee', 'topics'],
        include: [
            {
                model: Document,
                required: false,
                where: { category: 'paper_files' }
            },
            {
                required: true,
                model: Student,
                include: [
                    User.scope("min"),
                    Domain,
                    Specialization 
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
        throw new ResponseErrorForbidden();
    }
    if(paper.teacherId != user.teacher.id) {
        throw new ResponseErrorForbidden();
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
        });
        Mailer.sendRemovedPaperNotice(student, user);
        await transaction.commit();
    } catch(err) {
        await transaction.rollback();
        throw err;
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

export const getCommitteee = async (user: User, committeeId: number) => {
    const committee = await Committee.findOne({
        where: { id: committeeId },
        include: [Paper.scope(['student', 'teacher', 'documents', 'grades', 'topics'])]
    });
    if(!committee) {
        throw "NOT_FOUND";
    }
    if(committee.members.findIndex(member => member.id == user.teacher?.id) < 0) {
        throw "TEACHER_NOT_IN_COMMITTEE";
    }
    let resp: any = copyObject(committee);
    
    resp.members = resp.members.map(member => {
        let parsedMember: any = { ...member }
        parsedMember.teacherId = member.id
        parsedMember.role = member.committeeMember.role;
        return parsedMember;
    });

    resp.papers = await Promise.all(resp.papers.map(async paper => {
        let parsedPaper: any = { ...paper }
        parsedPaper.student = paper.student?.user;
        parsedPaper.teacher = paper.teacher?.user;
        let required = await DocumentController.getPaperRequiredDocuments(paper.id);
        parsedPaper.requiredDocuments = required.filter(doc => doc.category == 'paper_files');
        return parsedPaper;
    }));
    return resp;
}

export const gradePaper = async (user: User, paperId: number, forPaper: number, forPresentation: number) => {
    const paper = await Paper.findByPk(paperId, {
        include: [ Committee.scope("min") ]
    });
    if(!paper) {
        throw new ResponseErrorForbidden();
    }
    // Check if teacher is in the committee the paper is assigned to and they have right to grade
    if(paper.committee.members.findIndex(member => 
        member.id == user.teacher.id && member.committeeMember.role != 'secretary') < 0) {
        throw new ResponseErrorForbidden();
    }
    try {
        await PaperGrade.upsert({ paperId: paper.id, teacherId: user.teacher.id, forPaper, forPresentation });
        return true;
    } catch(err) {
        throw new ResponseError('Notele trebuie să fie întregi de la 1 la 10.');
    }
}

export const markGradesAsFinal = async (user: User, committeeId: number) => {
    const committee = await Committee.findByPk(committeeId);
    if(!committee) {
        throw new ResponseError("Comisie inexistentă.", "COMMITTEE_NOT_FOUND", 404);
    }
    const member = committee.members.find(member => member.id == user.teacher.id);
    if(!member || !['president', 'secretary'].includes(member.committeeMember.role)) {
        throw new ResponseErrorForbidden();
    }
    if(committee.finalGrades) {
        throw new ResponseErrorForbidden("Notele au fost deja marcate drept finale.", "ALREADY_MARKED");
    }
    committee.finalGrades = true;
    await committee.save();
    return { success: true };
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