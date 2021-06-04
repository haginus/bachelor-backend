import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import { User, Student, Domain, Paper, ActivationToken, SessionSettings, Teacher, sequelize } from "../models/models";
import { config } from "../config/config";
import { ResponseError } from "../util/util";
import * as Mailer from '../alerts/mailer';

const getUser = async (where) => {
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

export const login = async (req, res) => {
    const { email, password } = req.body;
    const user = await getUser({ email });
    if (user) {
        if(!user.password) {
            return res.status(401).json({ "error": "NOT_ACTIVATED" });
        }

        const validPassword = await bcrypt.compare(password, user.password);  // check if passwords match
        if (!validPassword) {
            return res.status(401).json({ "error": "WRONG_PASSWORD" });
        }
        // create and assign the token
        const token = jwt.sign({ id: user.id }, config.SECRET_KEY);
        let usr = JSON.parse(JSON.stringify(user)); // delete password in order to send to frontend
        delete usr.password; 
        res.header("auth-token", token).json({ "token": token, user: usr });
    } else {
        return res.status(401).json({ "error": "EMAIL_NOT_FOUND" });
    }
}

export const changePasswordWithActivationCode = async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    if(password !== confirmPassword && password.length < 6) {
        return res.status(400).json({ "error": "BAD_PASSWORD" });
    }
    const activationToken = await ActivationToken.findOne({ where: { token, used: false } })
    if (activationToken) {
        const user = await getUser({ id: activationToken.userId });
        if(!user) {
            return res.status(400).json({ "error": "USER_NOT_FOUND" });
        }

        await User.update({ password }, { where: {id: activationToken.userId } });
        await ActivationToken.update({used: true}, { where: { id: activationToken.id } })
        
        // create and assign the token
        const token = jwt.sign({ id: user.id }, config.SECRET_KEY);
        let usr = JSON.parse(JSON.stringify(user)); // delete password in order to send to frontend
        delete usr.password; 
        res.header("auth-token", token).json({ "token": token, user: usr });
    } else {
        return res.status(401).json({ "error": "INVALID_CODE" });
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
                throw new ResponseError(
                    "Ați trimis prea multe cereri de resetare a parolei.\nReîncercați peste o oră.",
                    "TOO_MANY_REQUESTS", 403);
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
            throw new ResponseError("A apărut o eroare la trimiterea e-mailului. Contactați administratorul.", null, 500);
        }
    }
    return { success: true };
}

export const isLoggedIn = async (req, res, next) => {
    let token = req.header('Authorization');
    if (!token || !token.startsWith('Bearer ')) {
        return res.status(403).json({ "error": "NOT_LOGGED_IN" });
    }
    
    token = token.slice(7).trimStart();  // get the value of the token
    try {
        const payload = jwt.verify(token, config.SECRET_KEY);
        const { id } = <any> payload; 
        let user = await getUser({ id });
        req._user = user;
        next();
    } catch(err) {
        res.status(403).json({ "error": "NOT_LOGGED_IN" });
    }
}

export const isAdmin = async (req, res, next) => {
    if(req._user.type !== "admin") {
        res.status(403).json({ "error": "NOT_AUTHORIZED" });
    } else {
        next();
    }
}

export const isStudent = async (req, res, next) => {
    if(req._user.type !== "student") {
        res.status(403).json({ "error": "NOT_AUTHORIZED" });
    } else {
        next();
    }
}

export const isTeacher = async (req, res, next) => {
    if(req._user.type !== "teacher") {
        res.status(403).json({ "error": "NOT_AUTHORIZED" });
    } else {
        next();
    }
}

export const getSessionSettings = () => {
    return SessionSettings.findOne();
}