const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/models.js");
const { config } = require("../config/config");

const getUser = async (where) => {
    return User.findOne({ where });
}

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const user = await getUser({ email });
    if (user) {
        const validPassword = await bcrypt.compare(password, user.password);  // check if passwords match
        if (!validPassword) {
            return res.status(401).json({ "error": "WRONG_PASSWORD" });
        }
        // create and assign the token
        const token = jwt.sign({ id: user.id }, config.SECRET_KEY);
        res.header("auth-token", token).json({"token": token});
    } else {
        return res.status(401).json({ "error": "EMAIL_NOT_FOUND" });
    }
}

exports.isLoggedIn = async (req, res, next) => {
    let token = req.header('Authorization');
    if (!token || !token.startsWith('Bearer ')) {
        return res.status(403).json({ "error": "NOT_LOGGED_IN" });
    }
    
    token = token.slice(7).trimStart();  // get the value of the token
    try {
        const payload = jwt.verify(token, config.SECRET_KEY);
        const { id } = payload; 
        let user = await getUser({ id });
        req._user = user;
        next();
    } catch(err) {
        res.status(403).json({ "error": "NOT_LOGGED_IN" });
    }
}