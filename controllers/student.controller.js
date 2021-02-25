const { Student, User, Topic, Teacher, Offer, Application, sequelize } = require("../models/models.js");
const UserController = require('./user.controller')
const { Op, Sequelize } = require("sequelize");


const getStudentByUid = (uid) => {
    return Student.findOne({
        include: [{
            model: User,
            attributes: {
                exclude: ['password']
            },
            where: { id: uid }
        }]
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

exports.getTeacherOffers = async (uid) => {
    let result = await User.findAll({
        attributes: ['id', 'firstName', 'lastName'],
        include: [{
            model: Teacher,
            required: true,
            include: [{
                model: Offer,
                required: true,
                attributes: {
                    exclude: ['teacherId'],
                    include: [
                        [ sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM applications AS application
                            WHERE
                                application.offerId = \`teacher->offers\`.id
                                AND
                                application.accepted = 1
                        )`), 'takenPlaces'],
                        [ sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM applications AS application
                            WHERE
                                application.offerId = \`teacher->offers\`.id
                                AND
                                application.studentId = (
                                    SELECT id FROM students
                                    WHERE userId = ${sequelize.escape(uid)}
                                    )
                        )`), 'hasApplied']
                    ]
                },
                include: {
                    model: Topic,
                    through: {
                        attributes: []
                    }
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
