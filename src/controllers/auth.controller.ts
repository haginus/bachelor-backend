import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import { User, Student, Domain, Paper, ActivationToken, SessionSettings, Teacher, sequelize } from "../models/models";
import { config } from "../config/config";
import { copyObject, ResponseError, ResponseErrorForbidden, ResponseErrorInternal, ResponseErrorUnauthorized } from "../util/util";
import * as Mailer from '../alerts/mailer';
import { WhereOptions } from "sequelize/types";

export const getUser = async (where: WhereOptions<User>) => {
    return User.findOne({ 
        where, 
        include: [
            { 
                association: User.associations.student,
                include: [
                    Student.associations.domain,
                    Student.associations.specialization,
                    Student.associations.paper
                ]
            },
            User.associations.teacher
        ]
    });
}

const createLoginResponse = async (user: User) => {
    const token = jwt.sign({ id: user.id }, config.SECRET_KEY);
    const profile = await user.getProfile();
    let responseUser = { ...copyObject(user), profile };
    delete responseUser.password; // remove the hashed password in order to send the response
    return { token, user: responseUser };
}

export const loginWithEmailAndPassword = async (email: string, password: string) => {
    const user = await getUser({ email });
    if(!user) {
        throw new ResponseErrorUnauthorized('E-mailul nu a fost găsit.', 'EMAIL_NOT_FOUND');
    }
    if(!user.password) {
        throw new ResponseErrorUnauthorized('Verificați-vă e-mailul pentru a activa acest cont.', 'NOT_ACTIVATED');
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if(!validPassword) {
        throw new ResponseErrorUnauthorized('Parolă incorectă.', 'WRONG_PASSWORD');
    }
    return createLoginResponse(user);
}

export const checkActivationCode = async (token: string) => {
    const activationToken = await ActivationToken.findOne({ where: { token, used: false } });
    if(!activationToken) {
        throw new ResponseErrorUnauthorized('Token-ul de activare este invalid sau a fost deja folosit.', 'INVALID_TOKEN');
    }
    const user = await getUser({ id: activationToken.userId });
    if(!user) {
        throw new ResponseErrorInternal();
    }
    return { email: user.email };
}

export const changePasswordWithActivationCode = async (token: string, password: string) => {
    if(!password || password.length < 6) {
        throw new ResponseError('Parola trebuie să aibă cel puțin 6 caractere.', 'BAD_PASSWORD');
    }
    const activationToken = await ActivationToken.findOne({ where: { token, used: false } });
    if(!activationToken) {
        throw new ResponseErrorUnauthorized('Token-ul de activare este invalid sau a fost deja folosit.', 'INVALID_TOKEN');
    }
    const user = await getUser({ id: activationToken.userId });
    if(!user) {
        throw new ResponseErrorInternal();
    }
    const transaction = await sequelize.transaction();
    try {
        user.password = password;
        activationToken.used = true;
        await activationToken.save({ transaction });
        await user.save({ transaction });
        await transaction.commit();
        return createLoginResponse(user);
    } catch(err) {
        await transaction.rollback();
        throw new ResponseErrorInternal();
    }
}

export const resetPassword = async (email: string) => {
    const user = await User.findOne({ where: { email } });
    if(user) {
        const prevSent = await ActivationToken.findAll({ where: { userId: user.id }, limit: 3, order: [['id', 'DESC'] ]});
        // If user has sent too many password reset requests
        if(prevSent.length == 3 && !prevSent.find(token => token.used)) {
            const createdAt = prevSent[0].createdAt.getTime();
            const now = new Date().getTime();
            if(createdAt + 60 * 60 * 1000 > now) {
                throw new ResponseErrorForbidden(
                    "Ați trimis prea multe cereri de resetare a parolei.\nReîncercați peste o oră.",
                    "TOO_MANY_REQUESTS");
            }
        }
        const transaction = await sequelize.transaction();
        try {
            let token = crypto.randomBytes(64).toString('hex');
            await ActivationToken.create({ token, userId: user.id }, { transaction });
            await Mailer.sendResetPasswordEmail(user, token);
            await transaction.commit();
        } catch(err) {
            await transaction.rollback();
            throw new ResponseErrorInternal("A apărut o eroare la trimiterea e-mailului. Contactați administratorul.");
        }
    } else {
        throw new ResponseError('Contul nu există.', 'EMAIL_NOT_FOUND');
    }
    return { success: true };
}

export const getCurrentUser = async (user: User) => {
    if(!user) {
        throw new ResponseError('Nu sunteți autentificat.', 'NOT_LOGGED_IN');
    }
    let profile = await user.getProfile();
    let resp = { ...copyObject(user), profile };
    delete resp.password;
    return resp;
}

export const getSessionSettings = () => {
    return SessionSettings.findOne();
}