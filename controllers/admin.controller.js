const { Student, User, Domain } = require("../models/models.js");
const UserController = require('./user.controller')
const { Op } = require("sequelize");


exports.getStudents = async (sort, order, filter, page, pageSize) => {
    const limit = pageSize;
    const offset = page * pageSize;
    if(limit <= 0 || offset < 0) {
        throw "INVALID_PARAMETERS";
    }

    let sortArray = [['id', 'ASC']]
    console.log(sort);
    console.log(order);
    if (['id', 'firstName', 'lastName', 'CNP', 'email', 'group'].includes(sort)) {
        if (order == 'DESC') {
            sortArray = [[sort, order]]
        } else {
            sortArray = [[sort, 'ASC']]
        }
    }

    let query = await User.findAndCountAll({
        //where,
        attributes: { exclude: ['password'] },
        include: [{ model: Student, required: true, include: [{ model: Domain }] }],
        limit,
        offset,
        order: sortArray
    });
    return query;
}