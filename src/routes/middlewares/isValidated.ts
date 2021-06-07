import { Request, Response, NextFunction } from "express";
import { ResponseErrorUnauthorized } from "../../util/util";

export default function() {
    return async function (req: Request, res: Response, next: NextFunction) {
        if(!req._user?.validated) {
            next(new ResponseErrorUnauthorized('Trebuie să finalizați procesul de validare pentru a efectua această acțiune.'));
        } else {
            next();
        }
    }
}