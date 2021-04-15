import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, Student, Domain, Paper, ActivationToken, SessionSettings, Teacher, sequelize } from "../models/models";
import { config } from "../config/config";

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
        const user = await User.findOne({ where: { id: activationToken.userId } })
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