const { User, Student, Domain, Paper, Specialization, Teacher } = require("../models/models.js");

const getUser = async (where) => {
    return User.findOne({
        where,
        attributes: { exclude: ['password'] },
        include: [ { model: Student, include: [ Domain, Specialization, Paper ] }, Teacher ]
    });
}

exports.validateUser = async (uid) => {
    const user = await getUser({id: uid});
    if(!user) {
        throw {
            status: 404,
            code: "USER_NOT_FOUND"
        }
    }
    if(user.validated) {
        throw {
            status: 400,
            code: "ALREADY_VALIDATED"
        }
    }

    user.validated = true;
    return user.save({ fields: ['validated'] });
}

exports.getUserData = async (uid) => {
    return getUser(uid);
}