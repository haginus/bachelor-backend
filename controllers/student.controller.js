const { Student, User, Topic, Teacher, Offer, Application, Paper, Domain, sequelize, StudentExtraData, Address, Document, SessionSettings, Specialization } = require("../models/models.js");
const UserController = require('./user.controller')
const DocumentController = require('./document.controller')
const AuthController = require('./auth.controller')
const { Op, Sequelize } = require("sequelize");
const fs = require('fs');
const path = require('path')
const mime = require('mime-types')
const paperRequiredDocuments = require('./../json/paper-required-documents.json')


const getStudentByUid = (uid) => {
    return Student.findOne({
        include: [
            {
                model: User,
                attributes: {
                    exclude: ['password']
                }
            }, 
            {
                model: Topic,
                through: {
                    attributes: []
                }
            },
            Domain,
            Specialization
        ],
        where: {
            userId: uid
        }
    });
}

exports.getStudentByUid = getStudentByUid;

exports.validateStudent = async (uid, topicIds) => {
    if(!uid || !topicIds || !Array.isArray(topicIds)) {
        throw {
            status: 400,
            code: "BAD_REQUEST"
        }
    }
    const student = await getStudentByUid(uid);
    try {
        await UserController.validateUser(uid);
    } catch(err) {
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

    return student.addTopics(topics);

}

exports.getTeacherOffers = async (uid, filters) => {
    let teacherNameFilter = {}

    if(filters?.teacherName) {
        const name = filters.teacherName.split(' ');  // split name in parts
        let orClauses = []
        for(let i = 0; i < name.length; i++) { // for every name part check match with firstName, lastName columns
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

    let topicFilter = filters.topicIds ? { topicId: filters.topicIds } : { }
    let onlyFreeOffersFilter = filters.onlyFree ? { limit: { [Op.gt]: literals.countOfferAcceptedApplications } } : { } 

    // the filters will be added to the query object by destructuring (i.e. ...topicFilter)

    let student = await getStudentByUid(uid);
    let result = await User.findAll({
        attributes: ['id', 'firstName', 'lastName'],
        where: {
            ...teacherNameFilter
        },
        include: [{
            model: Teacher,
            required: true,
            include: [{
                model: Offer,
                required: true,
                where: { 
                    domainId: student.domainId,
                    ...onlyFreeOffersFilter
                },
                attributes: {
                    exclude: ['teacherId'],
                    include: [
                        [ literals.countOfferAcceptedApplications, 'takenPlaces'],
                        [ literals.studentHasAppliendOffer(student.id), 'hasApplied']
                    ],
                },
                include: {
                    model: Topic,
                    required: true,
                    through: {
                        attributes: [],
                        where: {
                            ...topicFilter
                        }
                    },
                }
            }]
        }],
    });

    return JSON.parse(JSON.stringify(result)).map(user => {
        let teacher = user.teacher;
        delete user.teacher;
        return {...user, offers: teacher.offers}
    })
}

const literals = {
    countOfferAcceptedApplications: sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS application
        WHERE
            application.offerId = \`teacher->offers\`.id
            AND
            application.accepted = 1
    )`),
    studentHasAppliendOffer(studentId) {
        return sequelize.literal(`(
            SELECT COUNT(*)
            FROM applications AS application
            WHERE
                application.offerId = \`teacher->offers\`.id
                AND
                application.studentId = ${studentId}
        )`);
    },
    countOfferAcceptedApplicationsForApplications: sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS app
        WHERE
            app.offerId = \`offer\`.id
            AND
            app.accepted = 1
    )`),
}

exports.getSuggestedTeacherOffers = async (uid) => {
    const student = await getStudentByUid(uid);
    if(!student) {
        throw "MISSING_STUDENT";
    }
    const filters = {
        topicIds: student.topics.map(topic => topic.id)
    }

    return this.getTeacherOffers(uid, filters);
}

exports.applyToOffer = async (uid, offerId, title, description, usedTechnologies) => {
    if(!(await checkApplyPeriod())) { // check if today is in the application period
        throw "NOT_IN_APPLY_PERIOD"
    }
    const offer = await Offer.findOne({
        where: { id: offerId },
        include: {
            model: Application
        }
    }); // get offer
    if(!offer) {
        throw "OFFER_NOT_FOUND"
    }
    const student = await this.getStudentByUid(uid); // get student
    if(!student) {
        throw "STUDENT_NOT_FOUND"
    }

    const hasPaper = await Paper.count({ where: { studentId: student.id }});  // check if student is associated
    if(hasPaper) {
        throw "NOT_ALLOWED"
    }

    if(student.domainId != offer.domainId) {  // check same domains
        throw "DOMAIN_MISMATCH"
    }
    if(offer.applications.length + 1 > offer.limit) { // check if limit is higher than application number
        throw "BUSY_OFFER"
    }
    if(offer.applications.filter(application => application.studentId == student.id).length > 0) { // check double applications
        throw "ALREADY_APPLIED"
    }
    let application = await Application.create({ title, description, usedTechnologies, studentId: student.id });
    return offer.addApplication(application);
}

exports.getApplications = async (uid, state) => {
    const student = await this.getStudentByUid(uid);
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
            studentId: student.id,
            ...stateFilter
        },
        include: [
            {
                required: true,
                model: Offer,
                include: [
                    {
                        model: Domain
                    },
                    {
                        model: Topic
                    },
                    {
                        model: Teacher,
                        include: {
                            model: User,
                            attributes: ["id", "firstName", "lastName"] 
                        }
                    },
                ],
                attributes: {
                    include: [
                        [literals.countOfferAcceptedApplicationsForApplications, 'takenPlaces']
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

exports.getApplication = (id) => {
    return Application.findOne({ 
        where: { id },
        include: [{
            model: Offer
        }]
    })
}

exports.cancelApplication = async (user, applicationId) => {
    const student = await this.getStudentByUid(user.id);

    let application = await this.getApplication(applicationId);
    if(!application) {
        throw "MISSING_APPLICATION"
    }
    if(application.studentId != student.id) {
        throw "UNAUTHORIZED"
    }

    if(application.accepted != null) { // student can't delete an application after it has been accepted / declined by teacher
        throw "NOT_ALLOWED"
    }

    await application.destroy();

    return { success: true }
}

exports.getPaper = async (uid) => {
    const student = await this.getStudentByUid(uid);
    let paper = await Paper.scope(["documents", "teacher"]).findOne({ where: { studentId: student.id } });
    paper = JSON.parse(JSON.stringify(paper)); // sequelize will return the user info nested as `user` in paper.teacher
    if(paper) {
        paper.teacher = paper.teacher.user;
    }
    return paper;
}

exports.getExtraData = async (uid) => {
    const student = await this.getStudentByUid(uid);
    return StudentExtraData.scope("noKeys").findOne({ where: { studentId: student.id } });
}

exports.setExtraData = async (uid, data) => {  // sets the new extra data and triggers document generation
    const sessionSettings = await SessionSettings.findOne();
    if(!(await checkFileSubmissionPeriod(sessionSettings))) {
        throw "NOT_IN_FILE_SUBMISSION_PERIOD";
    }
    const student = await this.getStudentByUid(uid);
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
    } catch(err) {
        throw "INVALID_DATA";
    }
    const transaction = await sequelize.transaction(); // initialize a SQL transaction
    if(oldData) { // if data exists
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
            if(dataUpdated || addressUpdated) {
                await generatePaperDocuments(student, data, sessionSettings);
            }
            await transaction.commit();
        } catch(err) {
            await transaction.rollback(); // in case anything goes wrong, we rollback the transaction
            if(err == "INTERNAL_ERROR") {
                throw err;
            } else throw "INVALID_DATA";
        }
    } else { // if data does not exist, we create it
        try {
            newMainData.studentId = student.id;
            let extraDataModel = await StudentExtraData.create(newMainData, { transaction });
            let addressModel = await Address.create(newAddress, { transaction });
            await extraDataModel.setAddress(addressModel, { transaction });
            await generatePaperDocuments(student, data);
            await transaction.commit();
        } catch(err) {
            await transaction.rollback();
            if(err == "INTERNAL_ERROR") {
                throw err;
            } else throw "INVALID_DATA";
        }
    }
    return { success: true }
}

const generatePaperDocuments = async (student, extraData, sessionSettings) => {
    let paper = await this.getPaper(student.user.id);
    if(!paper) {
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
        let signUpFormDocument = await Document.create({ name: 'sign_up_form', category: "secretary_files", type: 'generated',
            paperId: paper.id, mimeType: 'application/pdf' }, { transaction });

        fs.writeFileSync(getStoragePath(`${signUpFormDocument.id}.pdf`), signUpFormBuffer); // write to storage

        let statutoryDeclarationBuffer = await DocumentController.generateDocument('statutory_declaration', data);  // generate PDF
        let statutoryDeclarationDocument = await Document.create({ name: 'statutory_declaration', category: "secretary_files", type: 'generated',
            paperId: paper.id, mimeType: 'application/pdf' }, { transaction });

        fs.writeFileSync(getStoragePath(`${statutoryDeclarationDocument.id}.pdf`), statutoryDeclarationBuffer); // write to storage

        let liquidationFormBuffer = await DocumentController.generateDocument('liquidation_form', data);  // generate PDF
        let liquidationFormDocument = await Document.create({ name: 'liquidation_form', category: "secretary_files", type: 'generated',
            paperId: paper.id, mimeType: 'application/pdf' }, { transaction });

        fs.writeFileSync(getStoragePath(`${liquidationFormDocument.id}.pdf`), liquidationFormBuffer); // write to storage

        await transaction.commit();
    } catch(err) {
        await transaction.rollback();
        console.log(err);
        throw "INTERNAL_ERROR";
    }
}

exports.uploadPaperDocument = async (user, documentFile, name, type) => {
    if(!(await checkFileSubmissionPeriod())) {
        throw "NOT_IN_FILE_SUBMISSION_PERIOD";
    }
    
    if(type == 'generated') { // do not allow "uploading" generated files
        throw "BAD_REQUEST";
    }

    const paper = user.student.paper;
    if(!paper) { // only allow uploads if paper exists
        throw "NOT_AUTHORIZED";
    }
    const paperId = paper.id;
    const requiredDocuments = await this.getPaperRequiredDocuments(user, null);
    const mimeType = documentFile.mimetype; // get uploaded file mimeType
    const uploadedBy = user.id;
    const requiredDoc = requiredDocuments
        .find(doc => doc.name == name && doc.uploadBy == 'student'); // find uploaded doc name in required list
    if(!requiredDoc) { // if it is not then throw error
        throw "INVALID_DOCUMENT";
    }
    if(!requiredDoc.types[type]) { // check if uploaded doc type is required
        throw "INVALID_DOCUMENT_TYPE";
    }
    const acceptedMimeTypes = requiredDoc.acceptedMimeTypes.split(','); // get accepted mimeTypes
    if(!acceptedMimeTypes.includes(mimeType)) { // check if uploaded doc mimeType is in the accepted array
        throw "INVALID_DOCUMENT_MIMETYPE";
    }

    const fileExtension = mime.extension(mimeType); // get the file extension
    const category = requiredDoc.category;

    const paperDocuments = await Document.findAll({ where: { name, paperId } }); // find all documents of name from paper

    if(type == 'signed') { // if uploaded document type is signed
        if(paperDocuments.filter(doc => doc.type == 'generated').length == 0) { // check if generated document exists
            throw "MISSING_GENERATED_DOCUMENT";
        }
        if(paperDocuments.filter(doc => doc.type == 'signed').length > 0) { // check if not signed before
            throw "ALREADY_SIGNED";
        }
    }

    if(type == 'copy') { // if uploaded document type is copy
        if(paperDocuments.filter(doc => doc.type == 'copy').length > 0) { // check if uploaded before
            throw "ALREADY_UPLOADED";
        }
    }

    const transaction = await sequelize.transaction(); // start a db transaction
    const newDocument = await Document.create({ name, type, mimeType, paperId, category, uploadedBy }, { transaction }); // create a new doc in db
    try {
        fs.writeFileSync(getStoragePath(`${newDocument.id}.${fileExtension}`), documentFile.data); // write doc to storage, throws error
        await transaction.commit(); // commit if everything is fine
    } catch(err) {
        console.log(err);
        await transaction.rollback(); // rollback if anything goes wrong
        throw "INTERNAL_ERROR";
    }

    return newDocument;
}

const getStoragePath = (fileName) => {
    return path.resolve(process.env.PWD, 'storage', 'documents', fileName);
}
/**
 * 
 * @param {User} user 
 * @param {StudentExtraData} [extraData] 
 * @param {SessionSettings} [sessionSettings]
 * @returns A list of required documents corresponding to the user's paper.
 */

exports.getPaperRequiredDocuments = async (user, extraData, sessionSettings) => { // user must be provided, extraData can be null
    if(!user?.student?.paper) { // if student has no paper
        throw "UNAUTHORIZED";
    }

    if(!extraData) { // if extraData was not provided
        extraData = await this.getExtraData(user.id);
    }

    if(!sessionSettings) { // if sessionSettings was not provided
        sessionSettings = await AuthController.getSessionSettings();
    }

    let isMarried, isPreviousPromotion, paperType;
    if(!extraData) { // if student didn't set up extraData, we assume the following
        isMarried = false;
    } else { // else we get the data we need
        isMarried = ['married', 're_married', 'widow'].includes(extraData.civilState);
    }

    isPreviousPromotion = sessionSettings?.currentPromotion != user.student.promotion; // check if student is in different promotion
    paperType = user.student.domain.type; // paper type is the same as student domain type

    return paperRequiredDocuments.filter(doc => {
        if(!doc.onlyFor) { // if document is required for everyone
            return true;
        }
        if(doc.onlyFor.married && !isMarried) { // if document requires married status and student is not married
            return false;
        }
        if(doc.onlyFor.paperType && doc.onlyFor.paperType != paperType) { // if doc requires a different paper type
            return false;
        }
        if(doc.onlyFor.previousPromotions && !isPreviousPromotion) { // if doc requires a previous promotion and student is in current promotion
            return false;
        }
        return true; // if all tests passed then student needs to have this document
    }).map(doc => {
        let sentDoc = { ...doc }
        delete sentDoc['onlyFor']; // remove the onlyFor attribute
        sentDoc['acceptedExtensions'] = doc.acceptedMimeTypes.split(',') // get accepted extensions from mimeType
                                    .map(mimeType => mime.extension(mimeType)).filter(t => t); // remove not found mimeType extensions (false)
        return sentDoc;
    })
}

const checkApplyPeriod = async () => {
    const sessionSettings = await SessionSettings.findOne();
    if(sessionSettings == null) { // settings not set
        return false;
    }
    const today = new Date().getTime();
    const start = new Date(sessionSettings.applyStartDate).getTime();
    const end = new Date(sessionSettings.applyEndDate).getTime();

    return start <= today && today <= end;
}

// Session Settings may miss
const checkFileSubmissionPeriod = async (sessionSettings) => {
    if(!sessionSettings) {
        sessionSettings = await SessionSettings.findOne();
    }
    if(sessionSettings == null) { // settings not set
        return false;
    }
    const today = new Date().getTime();
    const start = new Date(sessionSettings.fileSubmissionStartDate).getTime();
    const end = new Date(sessionSettings.fileSubmissionEndDate).getTime();

    return start <= today && today <= end;
}