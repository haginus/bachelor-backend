import { Request, Response, NextFunction } from "express";
import { ValidationError } from "sequelize";
import { ResponseError, ResponseErrorInternal } from "../../util/util";

import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

Sentry.init({
  dsn: "https://ce05db7abd354697b9e417b27f3851ee@o797184.ingest.sentry.io/6144520",
  tracesSampleRate: 1.0,
});

export default function () {
    return function (err: Error, req: Request, res: Response, next: NextFunction) {
        let shownError!: ResponseError;
        if (err instanceof ValidationError) {
            shownError = new ResponseError(err.errors[0].message);
        } else if (!(err instanceof ResponseError)) {
            Sentry.captureException(err);
            console.log(err)
            shownError = new ResponseError('A apărut o eroare. Contactați administratorul.', 'INTERNAL_ERROR', 500);
        } else {
            console.log(err)
            if(err instanceof ResponseErrorInternal) {
                Sentry.captureException(err);
            }
            shownError = err;
        }
        res.status(shownError.httpStatusCode).json(shownError);
    }
}