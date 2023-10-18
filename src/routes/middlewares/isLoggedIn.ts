import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config/config";
import { ResponseErrorUnauthorized } from "../../util/util";
import { getUser } from '../../controllers/auth.controller'

export default function(options?: IsLoggedInOptions) {
    return async function (req: Request, res: Response, next: NextFunction) {
        const getToken = options?.getToken || defaultGetToken;
        let token = getToken(req);
        if (!token) {
            if(options?.optional) return next();
            return next(new ResponseErrorUnauthorized('Nu sunteți autentificat.', 'NOT_LOGGED_IN'));
        }
        try {
            const payload = jwt.verify(token, config.SECRET_KEY);
            const { id, impersonatedBy } = <any> payload; 
            let user = await getUser({ id });
            if(!user) throw '';
            req._user = user;
            req._impersonatedBy = impersonatedBy || null;
            next();
        } catch(err) {
            next(new ResponseErrorUnauthorized('Nu sunteți autentificat.', 'NOT_LOGGED_IN'));
        }
    }
}

export interface IsLoggedInOptions {
    optional?: boolean;
    getToken?: (request?: Request) => string;
}

export const defaultGetToken = (req: Request) => {
    const token = req.header('Authorization');
    return token?.startsWith('Bearer ') ? token.slice(7).trimStart() : null;
}