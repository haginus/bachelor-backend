import { Student, User, Topic, Teacher, Offer, Application, Paper, Domain, sequelize, StudentExtraData, Address, Document, SessionSettings, Specialization, DocumentType } from "../models/models";
import * as UserController from './user.controller';
import * as DocumentController from './document.controller';
import * as AuthController from './auth.controller';
import { Model, Op, Sequelize } from "sequelize";
import fs from 'fs';
import path from 'path';
import { UploadedFile } from "express-fileupload";
import * as Mailer from "../alerts/mailer";



const getStoragePath = DocumentController.getStoragePath;

const getStudentByUid = (uid) => {
    return Student.findOne({
        include: [
            {
                model: User as typeof Model,
                attributes: {
                    exclude: ['password']
                }
            },
            {
                model: Topic as typeof Model,
                through: {
                    attributes: []
                }
            },
            Domain as typeof Model,
            Specialization as typeof Model
        ],
        where: {
            userId: uid
        }
    });
}


export class StudentController {
    public static getStudentByUid = getStudentByUid;

    public static validateStudent = async (uid, topicIds) => {
        if (!uid || !topicIds || !Array.isArray(topicIds)) {
            throw {
                status: 400,
                code: "BAD_REQUEST"
            }
        }
        const student = await getStudentByUid(uid);
        try {
            await UserController.validateUser(uid);
        } catch (err) {
            throw err;
        }

        let topics;
        topics = await Topic.findAll({
            where: {
                id: {
                    [Op.in]: topicIds
                }
            }
        });

        return student.setTopics(topics);

    }

    public static getTeacherOffers = async (uid, filters) => {
        let teacherNameFilter = {}

        if (filters?.teacherName) {
            const name = filters.teacherName.split(' ');  // split name in parts
            let orClauses = []
            for (let i = 0; i < name.length; i++) { // for every name part check match with firstName, lastName columns
                let or = {
                    [Op.or]: [
                        { firstName: { [Op.substring]: name[i] } },
                        { lastName: { [Op.substring]: name[i] } },
                    ]
                }
                orClauses.push(or);
            }
            teacherNameFilter = {
                [Op.or]: orClauses
            }
        }

        let topicFilter = filters.topicIds ? { topicId: filters.topicIds } : {}
        let onlyFreeOffersFilter = filters.onlyFree ? { limit: { [Op.gt]: StudentController.literals.countOfferAcceptedApplications } } : {}

        // the filters will be added to the query object by destructuring (i.e. ...topicFilter)

        let student = await getStudentByUid(uid);
        let result = await User.findAll({
            attributes: ['id', 'firstName', 'lastName'],
            where: {
                ...teacherNameFilter
            },
            include: [{
                model: Teacher as typeof Model,
                required: true,
                include: [{
                    model: Offer as typeof Model,
                    required: true,
                    where: {
                        domainId: student.domainId,
                        ...onlyFreeOffersFilter
                    },
                    attributes: {
                        exclude: ['teacherId'],
                        include: [
                            [StudentController.literals.countOfferAcceptedApplications, 'takenPlaces'],
                            [StudentController.literals.studentHasAppliendOffer(student.id), 'hasApplied']
                        ],
                    },
                    include: [{
                        model: Topic as typeof Model,
                        required: true,
                        through: {
                            attributes: [],
                            where: {
                                ...topicFilter
                            }
                        },
                    }]
                }]
            }],
        });

        return JSON.parse(JSON.stringify(result)).map(user => {
            let teacher = user.teacher;
            delete user.teacher;
            return { ...user, offers: teacher.offers }
        })
    }

    private static literals = {
        countOfferAcceptedApplications: Sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS application
        WHERE
            application.offerId = \`teacher->offers\`.id
            AND
            application.accepted = 1
    )`),
        studentHasAppliendOffer(studentId) {
            return Sequelize.literal(`(
            SELECT COUNT(*)
            FROM applications AS application
            WHERE
                application.offerId = \`teacher->offers\`.id
                AND
                application.studentId = ${studentId}
        )`);
        },
        countOfferAcceptedApplicationsForApplications: Sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS app
        WHERE
            app.offerId = \`offer\`.id
            AND
            app.accepted = 1
    )`),
    }

    public static getSuggestedTeacherOffers = async (uid) => {
        const student = await getStudentByUid(uid);
        if (!student) {
            throw "MISSING_STUDENT";
        }
        const filters = {
            topicIds: student.topics.map(topic => topic.id)
        }

        return StudentController.getTeacherOffers(uid, filters);
    }

    public static applyToOffer = async (uid, offerId, title, description, usedTechnologies) => {
        if (!(await StudentController.checkApplyPeriod())) { // check if today is in the application period
            throw "NOT_IN_APPLY_PERIOD"
        }
        const offer = await Offer.findOne({
            where: { id: offerId },
            include: [
                Offer.associations.applications,
                {
                    association: Offer.associations.teacher,
                    include: [Teacher.associations.user]
                }
            ]
        }); // get offer
        if (!offer) {
            throw "OFFER_NOT_FOUND"
        }
        const student = await StudentController.getStudentByUid(uid); // get student
        if (!student) {
            throw "STUDENT_NOT_FOUND"
        }

        const hasPaper = await Paper.count({ where: { studentId: student.id } });  // check if student is associated
        if (hasPaper) {
            throw "NOT_ALLOWED"
        }

        if (student.domainId != offer.domainId) {  // check same domains
            throw "DOMAIN_MISMATCH"
        }
        if (offer.applications.length + 1 > offer.limit) { // check if limit is higher than application number
            throw "BUSY_OFFER"
        }
        if (offer.applications.filter(application => application.studentId == student.id).length > 0) { // check double applications
            throw "ALREADY_APPLIED"
        }
        let application = await Application.create({ title, description, usedTechnologies, studentId: student.id, offerId: offer.id });
        Mailer.sendNewApplicationEmail(student.user, offer.teacher.user, application);
        return application;
    }

    public static getApplications = async (uid, state) => {
        const student = await StudentController.getStudentByUid(uid);
        let stateFilter;
        switch (state) {
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
                studentId: student.id,
                ...stateFilter
            },
            include: [
                {
                    required: true,
                    model: Offer as typeof Model,
                    include: [
                        {
                            model: Domain as typeof Model
                        },
                        {
                            model: Topic as typeof Model
                        },
                        {
                            model: Teacher as typeof Model,
                            include: [{
                                model: User as typeof Model,
                                attributes: ["id", "firstName", "lastName"]
                            }]
                        },
                    ],
                    attributes: {
                        include: [
                            [StudentController.literals.countOfferAcceptedApplicationsForApplications, 'takenPlaces']
                        ]
                    }
                },
            ],
            order: [
                ['accepted', 'ASC']
            ],
        });

        result = JSON.parse(JSON.stringify(result)).map(application => {
            application.offer.teacher = application.offer.teacher.user;
            return application;
        })

        return result;
    }

    public static getApplication = (id) => {
        return Application.findOne({
            where: { id },
            include: [{
                model: Offer as typeof Model
            }]
        })
    }

    public static cancelApplication = async (user, applicationId) => {
        const student = await StudentController.getStudentByUid(user.id);

        let application = await StudentController.getApplication(applicationId);
        if (!application) {
            throw "MISSING_APPLICATION"
        }
        if (application.studentId != student.id) {
            throw "UNAUTHORIZED"
        }

        if (application.accepted != null) { // student can't delete an application after it has been accepted / declined by teacher
            throw "NOT_ALLOWED"
        }

        await application.destroy();

        return { success: true }
    }

    public static getPaper = async (uid) => {
        const student = await StudentController.getStudentByUid(uid);
        let paper = await Paper.scope(["documents", "teacher", "topics"]).findOne({ where: { studentId: student.id } });
        let paperRes: any = JSON.parse(JSON.stringify(paper)); // sequelize will return the user info nested as `user` in paper.teacher
        if (paper) {
            paperRes.teacher = paper.teacher.user;
        }
        return paperRes;
    }

    public static getExtraData = async (uid) => {
        const student = await StudentController.getStudentByUid(uid);
        return StudentExtraData.scope("noKeys").findOne({ where: { studentId: student.id } });
    }

    public static setExtraData = async (uid, data) => {  // sets the new extra data and triggers document generation
        const sessionSettings = await SessionSettings.findOne();
        if (!(await DocumentController.checkFileSubmissionPeriod('secretary_files', sessionSettings))) {
            throw "NOT_IN_FILE_SUBMISSION_PERIOD";
        }
        const student = await StudentController.getStudentByUid(uid);
        const oldData = await StudentExtraData.findOne({ where: { studentId: student.id } });
        let newAddress, newMainData;
        try {
            newAddress = data.address;
            newMainData = { ...data };
            delete newMainData["address"];
            delete newMainData["id"]; // remove attributes that may interfere to the normal identification process
            delete newMainData["studentId"];
            delete newAddress["id"];
            delete newAddress["studentExtraDatumId"];
        } catch (err) {
            throw "INVALID_DATA";
        }
        const transaction = await sequelize.transaction(); // initialize a SQL transaction
        if (oldData) { // if data exists
            try {
                let [dataUpdated] = await StudentExtraData.update(newMainData, {
                    where: { studentId: student.id },
                    transaction,
                    fields: ["birthLastName", "parentInitial", "fatherName", "motherName", "civilState", "dateOfBirth", "citizenship",
                        "ethnicity", "placeOfBirthCountry", "placeOfBirthCounty", "placeOfBirthLocality", "landline", "mobilePhone", "personalEmail"]
                }); // update main data
                let [addressUpdated] = await Address.update(newAddress, {
                    where: { studentExtraDatumId: oldData.id },
                    transaction,
                    fields: ["locality", "county", "street", "streetNumber", "building", "stair", "floor", "apartment"]
                }); // update address
                if (dataUpdated || addressUpdated) {
                    await StudentController.generatePaperDocuments(student, data, sessionSettings);
                }
                await transaction.commit();
            } catch (err) {
                await transaction.rollback(); // in case anything goes wrong, we rollback the transaction
                if (err == "INTERNAL_ERROR") {
                    throw err;
                } else throw "INVALID_DATA";
            }
        } else { // if data does not exist, we create it
            try {
                newMainData.studentId = student.id;
                let extraDataModel = await StudentExtraData.create(newMainData, { transaction });
                let addressModel = await Address.create(newAddress, { transaction });
                await extraDataModel.setAddress(addressModel, { transaction });
                await StudentController.generatePaperDocuments(student, data, null);
                await transaction.commit();
            } catch (err) {
                await transaction.rollback();
                if (err == "INTERNAL_ERROR") {
                    throw err;
                } else throw "INVALID_DATA";
            }
        }
        return { success: true }
    }

    public static generatePaperDocuments = async (student: Student, extraData: StudentExtraData, sessionSettings: SessionSettings) => {
        let paper = await StudentController.getPaper(student.user.id);
        if (!paper) {
            throw "BAD_REQUEST";
        }

        const transaction = await sequelize.transaction();
        try {
            // delete old generated and signed documents
            await Document.destroy({
                transaction,
                where: {
                    paperId: paper.id,
                    name: {
                        [Op.in]: ['sign_up_form', 'statutory_declaration', 'liquidation_form']
                    }
                }
            });

            let data = { ...JSON.parse(JSON.stringify(student)), extra: extraData }
            data.paper = JSON.parse(JSON.stringify(paper));
            data.sessionSettings = JSON.parse(JSON.stringify(sessionSettings));

            let signUpFormBuffer = await DocumentController.generateDocument('sign_up_form', data);  // generate PDF
            let signUpFormDocument = await Document.create({
                name: 'sign_up_form', category: "secretary_files", type: 'generated',
                paperId: paper.id, mimeType: 'application/pdf', uploadedBy: null
            }, { transaction });

            fs.writeFileSync(getStoragePath(`${signUpFormDocument.id}.pdf`), signUpFormBuffer); // write to storage

            let statutoryDeclarationBuffer = await DocumentController.generateDocument('statutory_declaration', data);  // generate PDF
            let statutoryDeclarationDocument = await Document.create({
                name: 'statutory_declaration', category: "secretary_files", type: 'generated',
                paperId: paper.id, mimeType: 'application/pdf', uploadedBy: null
            }, { transaction });

            fs.writeFileSync(getStoragePath(`${statutoryDeclarationDocument.id}.pdf`), statutoryDeclarationBuffer); // write to storage

            let liquidationFormBuffer = await DocumentController.generateDocument('liquidation_form', data);  // generate PDF
            let liquidationFormDocument = await Document.create({
                name: 'liquidation_form', category: "secretary_files", type: 'generated',
                paperId: paper.id, mimeType: 'application/pdf', uploadedBy: null
            }, { transaction });

            fs.writeFileSync(getStoragePath(`${liquidationFormDocument.id}.pdf`), liquidationFormBuffer); // write to storage

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            console.log(err);
            throw "INTERNAL_ERROR";
        }
    }

    public static uploadPaperDocument = (user: User, documentFile: UploadedFile, name: string, type: DocumentType) => {
        return DocumentController.uploadPaperDocument(user, documentFile, name, type, 'student', user.student.paper.id);
    }


    public static getPaperRequiredDocuments = (user: User) => { 
        return DocumentController.getPaperRequiredDocuments(user.student.id);
    }

    public static checkApplyPeriod = async ()=> {
        const sessionSettings = await SessionSettings.findOne();
        if (sessionSettings == null) { // settings not set
            return false;
        }
        const today = new Date().getTime();
        const start = new Date(sessionSettings.applyStartDate).getTime();
        const end = new Date(sessionSettings.applyEndDate).getTime();

        return start <= today && today <= end;
    }


}