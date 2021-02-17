const { Student, User, Topic } = require("../models/models.js");
const UserController = require('./user.controller')
const { Op } = require("sequelize");


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
