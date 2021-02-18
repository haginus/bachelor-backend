const { Student, User, Domain } = require("../models/models.js");
const UserController = require('./user.controller')
const { Op } = require("sequelize");

const getUsers = (where) => {
    return User.findAll({
        where,
        attributes: { exclude: ['password'] },
        include: [ { model: Student, include: [ { model: Domain } ] } ]
    });
}

exports.getStudents = (filter) => {
    return getUsers({ type: 'student' });
}