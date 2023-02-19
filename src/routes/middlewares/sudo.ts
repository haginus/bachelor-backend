import { Request, Response, NextFunction } from "express";
import { ResponseErrorUnauthorized } from "../../util/util";
import bcrypt from "bcrypt";

export default function({ soft = false } = {}) {
    return async function (req: Request, res: Response, next: NextFunction) {
        const headerPassword = req.header("X-Sudo-Password");
        const validPassword = await bcrypt.compare(req.body.password || headerPassword || "", req._user.password);
        if (!validPassword) {
            if (soft) {
                req._sudo = false;
                return next();
            }
            next(new ResponseErrorUnauthorized("Parolă incorectă.", "WRONG_PASSWORD"));
        } else {
            req._sudo = true;
            next();
        }
    }
}