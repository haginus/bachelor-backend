const { Topic } = require("../models/models.js");


exports.getTopics = () => {
    return Topic.findAll();
}