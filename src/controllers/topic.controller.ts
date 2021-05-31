import { Topic } from "../models/models";


export const getTopics = () => {
    return Topic.findAll();
}

export const addTopic = (name: string) => {
    return Topic.create({ name });
}

export const addTopics = (names: string[]) => {
    const toAdd = [];
    names.forEach(name => {
        toAdd.push({ name });
    });
    return Topic.bulkCreate(toAdd);
}