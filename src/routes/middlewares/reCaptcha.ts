import { Request, Response, NextFunction } from "express";
import { ReCaptchaError, verifyResponse } from "../../util/recaptcha";

export default function () {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { captcha } = req.body;
    const isRobot = !(await verifyResponse(captcha));
    if (isRobot) {
      next(new ReCaptchaError());
    } else {
      next();
    }
  }
}