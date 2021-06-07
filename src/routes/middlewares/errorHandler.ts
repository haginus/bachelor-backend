import { Request, Response, NextFunction } from "express";
import { ValidationError } from "sequelize";
import { ResponseError } from "../../util/util";

export default function () {
    return function (err: Error, req: Request, res: Response, next: NextFunction) {
        let shownError!: ResponseError;
        if (err instanceof ValidationError) {
            shownError = new ResponseError(err.errors[0].message);
        } else if (!(err instanceof ResponseError)) {
            // TODO: Log error
            console.log(err);
            shownError = new ResponseError('A apărut o eroare. Contactați administratorul.', 'INTERNAL_ERROR', 500);
        } else {
            shownError = err;
        }
        res.status(shownError.httpStatusCode).json(shownError);
    }
}