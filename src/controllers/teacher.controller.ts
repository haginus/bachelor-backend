"use strict"
import { User, Teacher, Offer, Paper, PaperGrade, Document, Domain, Topic, Application, Student, sequelize, SessionSettings, StudentExtraData, Specialization, DocumentType, UploadPerspective, Committee, CommitteeActivityDay } from "../models/models";
import * as DocumentController from './/document.controller';
import * as PaperController from "./paper.controller";
import { Op, Sequelize, ValidationError } from "sequelize";
import * as Mailer from "../mail/mailer";
import { UploadedFile } from "express-fileupload";
import { arrayMap, canApply, changeUserTree, copyObject, ResponseError, ResponseErrorForbidden, ResponseErrorNotFound, sortMembersByTitle } from "../util/util";
import { Logger } from "../util/logger";
import { LogName } from "../lib/types/enums/log-name.enum";


export const validateTeacher = async (user: User) => {
    const transaction = await sequelize.transaction();
    try {
        user.validated = true;
        await user.save({ transaction });
        await Logger.log(user, {
            name: LogName.UserValidated,
            userId: user.id,
          }, { transaction });
        await transaction.commit();
        return user;
    } catch(err) {
        await transaction.rollback();
        throw err;
    }
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
    topicIds: number[], limit: number, description: string) => {
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
        throw new ResponseErrorForbidden('Nu puteți seta o limită mai mare decât numărul de locuri deja ocupate.',
            'LIMIT_LOWER_THAN_TAKEN_PLACES');
    }
    const transaction = await sequelize.transaction();
    try {
        offer.domainId = domainId;
        offer.limit = limit;
        offer.description = description;
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

export const addOffer = async (user: User, domainId: number, topicIds: number[], limit: number,
    description: string) => {
    if(limit < 1) {
        throw new ResponseError('Limita nu poate fi mai mică decât 1.', 'LIMIT_LOWER_THAN_1');
    }
    const transaction = await sequelize.transaction();
    try {
        const offer = await Offer.create({ domainId, limit, teacherId: user.teacher.id, description }, { transaction });
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

export async function deleteOffer(user: User, offerId: number): Promise<void> {
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
    if(offer.takenPlaces > 0) {
        throw new ResponseError("Ofertele cu cereri acceptate nu pot fi șterse.");
    }
    return offer.destroy();
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
                    User.scope(['min', 'profile'])
                ]
            },
        ],
        order: [
            ['accepted', 'ASC']
        ],
    });

    result = copyObject<any>(result).map(application => {
        // application.student = application.student.user;
        application.student = changeUserTree(application.student);
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
        throw new ResponseError("Limita ofertei a fost deja atinsă. Creșteți limita și reîncercați.", "LIMIT_REACHED", 403);
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
        const paperPayload = {
            title,
            description,
            studentId,
            teacherId: user.teacher.id,
            type: domain.paperType
        };
        const paper = await Paper.create(paperPayload, { transaction });
        const topicIds = application.offer.topics.map(topic => topic.id);
        await paper.setTopics(topicIds, { transaction });
        await Logger.log(user, {
            name: LogName.PaperCreated,
            paperId: paper.id,
            meta: {
                creationMode: 'applicationAccepted',
                applicationId,
                paperPayload,
            }
        }, { transaction });
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
        scope: ['committee', 'topics', 'gradesMin'],
        include: [
            {
                model: Document,
                required: false,
                where: { category: 'paper_files' }
            },
            {
                required: true,
                model: Student,
                attributes: ['promotion', 'group', 'studyForm', 'domainId', 'specializationId'],
                include: [
                    User.scope(["min", "profile"]),
                    Domain,
                    Specialization 
                ]
            }
        ]
    });

    return Promise.all(JSON.parse(JSON.stringify(papers)).map(async paper => {
        let required = await DocumentController.getPaperRequiredDocuments(paper.id);
        paper.student = changeUserTree(paper.student);
        paper.requiredDocuments = required.filter(doc => doc.category == 'paper_files');
        delete paper.grades;
        if(!paper.committee || !paper.committee?.finalGrades) paper.gradeAverage = null;
        return paper;
    }));
}

export const getStudentPapersExcel = async (user: User) => {
    return DocumentController.generatePaperList({ teacherId: user.teacher.id });
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
        const studentExtraData = await StudentExtraData.findOne({ where: { studentId }, transaction });
        if(studentExtraData) {
            await studentExtraData.destroy({ transaction });
            await Logger.log(user, {
                name: LogName.StudentExtraDataDeleted,
                studentExtraDataId: studentExtraData.id,
                meta: {
                    reason: 'paperDeleted'
                }
            }, { transaction });
        }
        await paper.destroy({ transaction });
        await Logger.log(user, {
            name: LogName.PaperDeleted,
            paperId: paper.id,
        }, { transaction });
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
        committee.members = sortMembersByTitle(committee.members);
        return committee;
    });
}

function isCommitteeMember(user: User, committee: Committee, rights: { grading?: boolean; markGradesAsFinal?: boolean; schedulePapers?: boolean; } = { grading: false, markGradesAsFinal: false, schedulePapers: false }) {
    const member = committee.members.find(member => member.id == user.teacher?.id);
    const rightChecks = {
        grading: (teacher: Teacher) => teacher.committeeMember.role != 'secretary',
        markGradesAsFinal: (teacher: Teacher) => ['president', 'secretary'].includes(teacher.committeeMember.role),
        schedulePapers: (teacher: Teacher) => ['president', 'secretary'].includes(teacher.committeeMember.role),
    }
    return !!member && Object.keys(rightChecks).every(key => !rights[key] || rightChecks[key](member));
}

export const getCommittee = async (user: User, committeeId: number) => {
    const committee = await Committee.findOne({
        where: { id: committeeId },
        include: [Paper.scope(['student', 'teacher', 'documentsPaperFiles', 'gradesMin', 'topics'])]
    });
    if(!committee) {
        throw new ResponseErrorNotFound();
    }
    if(!isCommitteeMember(user, committee)) {
        throw new ResponseErrorForbidden();
    }
    let resp: any = copyObject(committee);
    
    resp.members = resp.members.map(member => {
        let parsedMember: any = { ...member }
        parsedMember.teacherId = member.id
        parsedMember.role = member.committeeMember.role;
        return parsedMember;
    });
    resp.members = sortMembersByTitle(resp.members);

    const memberDict = arrayMap(resp.members as Teacher[], (member) => member.id)

    resp.papers = await Promise.all(resp.papers.map(async paper => {
        let parsedPaper: any = { ...paper }
        parsedPaper.student = changeUserTree(paper.student);
        parsedPaper.teacher = changeUserTree(paper.teacher);
        let required = await DocumentController.getPaperRequiredDocuments(paper.id);
        parsedPaper.requiredDocuments = required.filter(doc => doc.category == 'paper_files');
        paper.grades.forEach(grade => { grade.teacher = memberDict[grade.teacherId]});
        return parsedPaper;
    }));
    return resp;
}

export async function schedulePapers(user: User, committeeId: number, dto: { paperPresentationTime: number; publicScheduling: boolean; papers: { paperId: number; scheduledGrading: string | null }[]; }) {
    const { papers, paperPresentationTime, publicScheduling } = dto;
    const committee = await Committee.findOne({
        where: { id: committeeId },
    });
    if(!committee) {
        throw new ResponseErrorNotFound();
    }
    if(!isCommitteeMember(user, committee, { schedulePapers: true })) {
        throw new ResponseErrorForbidden();
    }
    const committeePapers = arrayMap(committee.papers, paper => paper.id);
    const activityDays = arrayMap(committee.activityDays, day => day.startTime.toISOString().split('T')[0]);
    if(!papers.every(paper => !!committeePapers[paper.paperId])) {
        throw new ResponseError("Unele lucrări nu aparțin acestei comisii.");
    }
    if(
        !papers.every(paper => {
            const date = new Date(paper.scheduledGrading);
            return paper.scheduledGrading === null || (!isNaN(date.getTime()) && activityDays[date.toISOString().split('T')[0]])
        })
    ) {
        throw new ResponseError("Una sau mai multe date sunt invalide sau nu sunt în zilele de activitate atribuite comisiei.");
    }
    const transaction = await sequelize.transaction();
    try {
        await Committee.update(
            { paperPresentationTime, publicScheduling },
            { where: { id: committeeId }, transaction }
        );
        for(const { paperId, scheduledGrading } of papers) {
            await Paper.update(
                { scheduledGrading: scheduledGrading ? new Date(scheduledGrading) : null },
                { where: { id: paperId }, transaction }
            );
        }
        await transaction.commit();
        return getCommittee(user, committeeId);
    } catch(err) {
        await transaction.rollback();
        throw err;
    }
}

export const gradePaper = async (user: User, paperId: number, forPaper: number, forPresentation: number) => {
    if([forPaper, forPresentation].some(grade => grade < 1 || grade > 10 || !Number.isInteger(grade))) {
        throw new ResponseError('Notele trebuie să fie întregi de la 1 la 10.');
    }
    const paper = await Paper.findByPk(paperId, {
        include: [Committee.scope("min")]
    });
    if(!paper || !paper.committee) {
        throw new ResponseErrorForbidden();
    }
    // Check if teacher is in the committee the paper is assigned to and they have right to grade
    if(!isCommitteeMember(user, paper.committee, { grading: true })) {
        throw new ResponseErrorForbidden();
    }
    if(paper.committee.finalGrades) {
        throw new ResponseErrorForbidden("Nu puteți modifica nota deoarece notele au fost marcate drept finale.");
    }
    const transaction = await sequelize.transaction();
    try {
        await PaperGrade.upsert({ 
            paperId: paper.id, 
            teacherId: user.teacher.id,
            forPaper, 
            forPresentation 
        }, { transaction });
        await Logger.log(user, {
            name: LogName.PaperGraded,
            paperId: paper.id,
            meta: {
                forPaper,
                forPresentation
            }
        }, { transaction });
        await transaction.commit();
        return true;
    } catch(err) {
        await transaction.rollback();
        throw err;
    }
}

export const markGradesAsFinal = async (user: User, committeeId: number) => {
    const committee = await Committee.findByPk(committeeId);
    if(!committee) {
        throw new ResponseError("Comisie inexistentă.", "COMMITTEE_NOT_FOUND", 404);
    }
    if(!isCommitteeMember(user, committee, { markGradesAsFinal: true })) {
        throw new ResponseErrorForbidden();
    }
    if(committee.finalGrades) {
        throw new ResponseErrorForbidden("Notele au fost deja marcate drept finale.", "ALREADY_MARKED");
    }
    committee.finalGrades = true;
    await committee.save();
    return { success: true };
}

export async function getCommitteePaperDocumentsArchieve(user: User, committeeId: number) {
    const committee = await Committee.findByPk(committeeId);
    if(!committee) {
        throw new ResponseErrorNotFound();
    }
    if(!isCommitteeMember(user, committee)) {
        throw new ResponseErrorForbidden();
    }
    const papers = await Paper.findAll({
        where: { committeeId },
    });
    const paperIds = papers.map(paper => paper.id);
    return DocumentController.generatePaperDocumentsArchive(paperIds, ['paper']);
}

export async function generateCommitteStudentsDocument(user: User, committeeId: number, format: 'pdf' | 'excel' = 'pdf') {
    if(!['pdf', 'excel'].includes(format)) {
        throw new ResponseError('Format invalid.');
    }
    const committee = await Committee.findByPk(committeeId);
    if(!committee) {
        throw new ResponseErrorNotFound();
    }
    if(!isCommitteeMember(user, committee)) {
        throw new ResponseErrorForbidden();
    }
    switch(format) {
        case "pdf":
            return DocumentController.generateCommitteeStudents([committeeId]);
        case "excel":
            return DocumentController.generateCommitteeStudentsExcel([committeeId]);
        default:
            throw new ResponseError('Format invalid.');
    }
}

export async function getStudents(firstName?: string, lastName?: string, email?: string, domainId?: number): Promise<User[]> {
    const sessionSettings = await SessionSettings.findOne();
    if(!canApply(sessionSettings)) {
        throw new ResponseErrorForbidden();
    }
    
    const firstNameWhere = firstName ? { firstName: { [Op.substring]: firstName } } : { };
    const lastNameWhere = lastName ? { lastName: { [Op.substring]: lastName } } : { };
    const emailWhere = email ? { email: { [Op.substring]: email } } : { };
    const domainIdWhere = domainId ? { domainId } : { };
    return User.scope("min").findAll({
        where: { 
            type: "student",
            ...firstNameWhere,
            ...lastNameWhere,
            ...emailWhere,
        },
        include: [
            {
                association: User.associations.student,
                attributes: {
                    exclude: ["fundingForm"]
                },
                where: { ...domainIdWhere },
                include: [ 
                    Student.associations.paper,
                    Student.associations.specialization,
                    Student.associations.domain
                ]
            }
        ],
        limit: 10
    });
}

export async function addPaper(user: User, studentId: number, title: string, description: string, topicIds: number[]) {
    const sessionSettings = await SessionSettings.findOne();
    if(!canApply(sessionSettings)) {
        throw new ResponseError("Perioada de asociere s-a încheiat.");
    }
    const student = await Student.findByPk(studentId, {
        include: [ 
            Student.associations.user,
            Student.associations.domain,
            Student.associations.paper
        ]
    });
    if(!student) {
        throw new ResponseError("Studentul nu există.");
    }
    if(student.paper) {
        throw new ResponseError("Studentul are deja o lucrare.");
    }
    const topics = await Topic.findAll({ where: { id: topicIds }});
    if(topics.length == 0) {
        throw new ResponseError("Lucrarea trebuie să aibă teme.");
    }
    const transaction = await sequelize.transaction();
    try {
        const paperPayload = {
            title,
            description,
            studentId,
            teacherId: user.id,
            type: student.domain.paperType
        }
        const newPaper = await Paper.create(paperPayload, { transaction });
        await newPaper.setTopics(topics, { transaction });
        await Application.destroy({ where: { studentId }}), { transaction };
        await Logger.log(user, {
            name: LogName.PaperCreated,
            paperId: newPaper.id,
            meta: {
                creationMode: 'manual',
                paperPayload
            }
        }, { transaction });
        await transaction.commit();
        Mailer.sendAddedPaperNotice(student.user, user, newPaper);
        return newPaper;
    } catch(err) {
        await transaction.rollback();
        throw err;
    }
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