import { Topic } from "../models/models";
import { ResponseError } from "../util/util";


export const getTopics = () => {
    return Topic.findAll();
}

export const addTopic = (name: string) => {
    return Topic.create({ name });
}

export const addTopics = async (names: string[]) => {
    if(!names || !Array.isArray(names)) {
        throw new ResponseError('Numele temelor lipsesc.');
    }
    const toAdd = names.map(name => {
        return { name };
    });
    return Topic.bulkCreate(toAdd);
}