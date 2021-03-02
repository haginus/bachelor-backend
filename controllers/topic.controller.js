const { Topic } = require("../models/models.js");


exports.getTopics = () => {
    return Topic.findAll();
}

exports.addTopic = (name) => {
    return Topic.create({ name });
}

exports.addTopics = (names) => {
    const toAdd = []
    names.forEach(name => {
        toAdd.push({ name });
    });
    return Topic.bulkCreate(toAdd);
}