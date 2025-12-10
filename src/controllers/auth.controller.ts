import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import { User, Student, ActivationToken, SessionSettings, sequelize, SignUpRequestCreationAttributes, SignUpRequest, Specialization } from "../models/models";
import { config } from "../config/config";
import { copyObject, ResponseError, ResponseErrorForbidden, ResponseErrorInternal, ResponseErrorUnauthorized } from "../util/util";
import * as Mailer from '../mail/mailer';
import { FindOptions, Transaction, WhereOptions } from "sequelize/types";

const userFindOptions: FindOptions<User> = {
    include: [
        { 
            association: User.associations.student,
            include: [
                Student.associations.domain,
                Student.associations.specialization,
                Student.associations.paper
            ]
        },
        User.associations.teacher,
        User.associations.profile,
    ],
};

export const getUser = async (where: WhereOptions<User>) => {
    return User.findOne({ 
        where, 
        ...userFindOptions,
    });
}

export const getUsers = async (where: WhereOptions<User>) => {
    return User.findAll({ 
        where, 
        ...userFindOptions,
    });
}

interface AdditionalPayload {
    impersonatedBy?: number;
}

const createLoginResponse = async (user: User, additionalPayload: AdditionalPayload = {}, alternativeIdentities?: User[]) => {
    const tokenPayload = {
        id: user.id,
        ...additionalPayload
    };
    const token = jwt.sign(tokenPayload, config.SECRET_KEY);
    if(!alternativeIdentities) {
        const users = await getUsers({ email: user.email });
        alternativeIdentities = users.filter(u => u.id !== user.id);
    }
    alternativeIdentities?.forEach(u => { delete u.password });
    return { 
        token,
        user: await getCurrentUser(user, !!additionalPayload.impersonatedBy),
        alternativeIdentities,
    };
}

export const loginWithEmailAndPassword = async (email: string, password: string) => {
    const users = await getUsers({ email });
    if(users.length == 0) {
        throw new ResponseErrorUnauthorized('E-mailul nu a fost găsit.', 'EMAIL_NOT_FOUND');
    }
    const mainUser = users.find(u => !!u.password);
    if(!mainUser) {
        throw new ResponseErrorUnauthorized('Verificați-vă e-mailul pentru a activa acest cont.', 'NOT_ACTIVATED');
    }
    const validPassword = await bcrypt.compare(password, mainUser.password);
    if(!validPassword) {
        throw new ResponseErrorUnauthorized('Parolă incorectă.', 'WRONG_PASSWORD');
    }
    return createLoginResponse(mainUser, {}, users.filter(u => u.id !== mainUser.id));
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

export async function switchUser(currentUser: User, wantedUserId: number, impersonatedBy?: number) {
    const users = await getUsers({ email: currentUser.email });
    const wantedUser = users.find(u => u.id === wantedUserId);
    if(!wantedUser) {
        throw new ResponseError("Identitatea alternativă nu există.");
    }
    return createLoginResponse(wantedUser, { impersonatedBy }, users.filter(u => u.id !== wantedUser.id));
}

export async function impersonateUser(currentUser: User, wantedUserId: number) {
    const user = await getUser({ id: wantedUserId }); 
    if(!user)  {
        throw new ResponseError("Utilizatorul nu există.");
    }
    return createLoginResponse(user, { impersonatedBy: currentUser.id });
}

export async function releaseImpersonation(impersonatedBy: number) {
    if(!impersonatedBy) {
        throw new ResponseErrorForbidden();
    }
    const user = await getUser({ id: impersonatedBy }); 
    if(!user)  {
        throw new ResponseError("Utilizatorul nu există.");
    }
    return createLoginResponse(user);
}

export const resetPassword = async (email: string, t?: Transaction) => {
    const users = await User.findAll({ where: { email }, transaction: t });
    const user = users.find(u => !!u.password) || users[0];
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
        const transaction = t || await sequelize.transaction();
        try {
            let token = crypto.randomBytes(64).toString('hex');
            await ActivationToken.create({ token, userId: user.id }, { transaction });
            await Mailer.sendResetPasswordEmail(user, token);
            if(!t) await transaction.commit();
        } catch(err) {
            if(!t) await transaction.rollback();
            throw new ResponseErrorInternal("A apărut o eroare la trimiterea e-mailului. Contactați administratorul.");
        }
    } else {
        throw new ResponseError('Contul nu există.', 'EMAIL_NOT_FOUND');
    }
    return { success: true };
}

export const getCurrentUser = async (user: User, isImpersonated: boolean = false) => {
    if(!user) {
        throw new ResponseError('Nu sunteți autentificat.', 'NOT_LOGGED_IN');
    }
    let resp = { ...copyObject(user), isImpersonated };
    delete resp.password;
    return resp;
}

export const getAlternativeIdentities = async (user: User) => {
    const users = await getUsers({ email: user.email });
    users.forEach(u => { delete u.password });
    return users.filter(u => u.id !== user.id);
}

export const getSessionSettings = () => {
    return SessionSettings.findOne();
}

export const signUp = async (data: SignUpRequestCreationAttributes) => {
    if(await User.findOne({ where: { email: data.email } }) || await SignUpRequest.findOne({ where: { email: data.email }})) {
        throw new ResponseError('Acest e-mail este deja înregistrat sau cererea este în curs de procesare.', 'EMAIL_EXISTS');
    }
    const specialization = await Specialization.findByPk(data.specializationId);
    if(!specialization) {
        throw new ResponseError('Programul de studii nu există.');
    }
    const result = await SignUpRequest.create(data);
    result.specialization = specialization;
    Mailer.sendSignUpRequrestNotice(result);
    return result;
}