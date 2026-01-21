import { Request, Response, NextFunction } from "express";
import { ResponseErrorUnauthorized } from "../../util/util";
import bcrypt from "bcrypt";

export default function ({ soft = false } = {}) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const toCheckPassword = req.body.password || req.header("X-Sudo-Password");
    if (!toCheckPassword && soft) {
      req._sudo = false;
      return next();
    }
    const isPasswordValid = await bcrypt.compare(toCheckPassword, req._user.password);
    if (!isPasswordValid) {
      next(new ResponseErrorUnauthorized("Parolă incorectă.", "WRONG_PASSWORD"));
    } else {
      req._sudo = true;
      next();
    }
  }
}