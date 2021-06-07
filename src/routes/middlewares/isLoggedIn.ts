import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config/config";
import { ResponseErrorUnauthorized } from "../../util/util";
import { getUser } from '../../controllers/auth.controller'

export default function() {
    return async function (req: Request, res: Response, next: NextFunction) {
        let token = req.header('Authorization');
        if (!token || !token.startsWith('Bearer ')) {
            next(new ResponseErrorUnauthorized('Nu sunteți autentificat.', 'NOT_LOGGED_IN'));
        }
        
        token = token.slice(7).trimStart();  // get the value of the token
        try {
            const payload = jwt.verify(token, config.SECRET_KEY);
            const { id } = <any> payload; 
            let user = await getUser({ id });
            req._user = user;
            next();
        } catch(err) {
            next(new ResponseErrorUnauthorized('Nu sunteți autentificat.', 'NOT_LOGGED_IN'));
        }
    }
}