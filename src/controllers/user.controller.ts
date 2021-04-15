import { Model } from "sequelize/types";
import { User, Student } from "../models/models";

const getUser = async (where) => {
    return User.findOne({
        where,
        attributes: { exclude: ['password'] },
        include: [
            {
                association: User.associations.student,
                include: [
                    Student.associations.domain,
                    Student.associations.specialization,
                    Student.associations.paper
                ]
            },
            User.associations.teacher ]
    });
}

export async function validateUser(uid) {
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

export async function getUserData(uid) {
    return getUser(uid);
}