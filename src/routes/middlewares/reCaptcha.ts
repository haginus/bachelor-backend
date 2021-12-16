import { Request, Response, NextFunction } from "express";
import { verifyResponse } from "../../util/recaptcha";
import { ResponseErrorUnauthorized } from "../../util/util";

export default function () {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { captcha } = req.body;
    const isRobot = !(await verifyResponse(captcha));
    if (isRobot) {
      next(new ResponseErrorUnauthorized('Nu ați trecut testul reCAPTCHA.', 'ARE_YOU_A_ROBOT_QUESTION_MARK'));
    } else {
      next();
    }
  }
}