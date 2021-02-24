const { User } = require("../models/models.js");
const UserController = require('./user.controller')


exports.validateTeacher = async (uid) => {
    return UserController.validateUser(uid);
}