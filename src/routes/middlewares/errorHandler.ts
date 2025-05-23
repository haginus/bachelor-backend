import { Request, Response, NextFunction } from "express";
import { ValidationError } from "sequelize";
import { config } from "../../config/config";
import { ResponseError, ResponseErrorInternal } from "../../util/util";

export default function () {
  let Sentry: any, Tracing: any;
  if (config.SENTRY_KEY) {
    Sentry = require('@sentry/node');
    Tracing = require('@sentry/tracing');
    Sentry.init({
      dsn: config.SENTRY_KEY,
      tracesSampleRate: 1.0,
    });
  }
  return function (err: Error, req: Request, res: Response, next: NextFunction) {
    function captureException(err: Error) {
      Sentry?.setUser(req._user ? { id: req._user.id, email: req._user.email } : null);
      Sentry?.captureException(err);
    }

    let shownError!: ResponseError;
    if (err instanceof ValidationError) {
      shownError = new ResponseError(err.errors[0].message);
    } else if (!(err instanceof ResponseError)) {
      captureException(err);
      console.log(err);
      shownError = new ResponseError('A apărut o eroare. Contactați administratorul.', 'INTERNAL_ERROR', 500);
    } else {
      console.log(err);
      if (err instanceof ResponseErrorInternal) {
        captureException(err);
      }
      shownError = err;
    }
    res.status(shownError.httpStatusCode).json(shownError);
  }
}