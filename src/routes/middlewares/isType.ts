import { Request, Response, NextFunction } from "express";
import { ResponseErrorUnauthorized } from "../../util/util";
import { UserType } from "../../models/models";

export default function(expectedType: UserType | UserType[]) {
    return async function (req: Request, res: Response, next: NextFunction) {
        const actualType = req._user?.type;
        let isType = true;
        if(Array.isArray(expectedType)) {
            isType = expectedType.includes(actualType);
        } else {
            isType = expectedType === actualType;
        }
        if(!isType) {
            next(new ResponseErrorUnauthorized());
        } else {
            next();
        }
    }
}