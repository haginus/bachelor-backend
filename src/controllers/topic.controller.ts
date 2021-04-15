import { Topic } from "../models/models";


export function getTopics() {
    return Topic.findAll();
}

export function addTopic(name) {
    return Topic.create({ name });
}

export function addTopics(names) {
    const toAdd = []
    names.forEach(name => {
        toAdd.push({ name });
    });
    return Topic.bulkCreate(toAdd);
}