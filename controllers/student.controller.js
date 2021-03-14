const { Student, User, Topic, Teacher, Offer, Application, sequelize } = require("../models/models.js");
const UserController = require('./user.controller')
const { Op, Sequelize } = require("sequelize");


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
            }
        ]
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
    }
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
    const offer = await Offer.findOne({
        where: { id: offerId },
        include: {
            model: Application
        }
    }); // get offer
    console.log(offer)
    if(!offer) {
        throw "OFFER_NOT_FOUND"
    }
    const student = await this.getStudentByUid(uid); // get student
    if(!student) {
        throw "STUDENT_NOT_FOUND"
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
