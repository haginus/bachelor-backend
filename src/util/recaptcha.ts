import { config } from "../config/config";
import axios from 'axios';
import { ResponseError } from "./util";

const SECRET = config.RECAPTCHA_SECRET_KEY;
const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export async function verifyResponse(token: string): Promise<boolean> {
  if(!SECRET) return true;
  const url = `${VERIFY_URL}?secret=${SECRET}&response=${token}`
  const res = await axios.post(url);
  return res.data.success == true;
}

export async function reCaptchaGuard(token: string): Promise<void> {
  if(!(await verifyResponse(token))) {
    throw new ReCaptchaError();
  }
}

export class ReCaptchaError extends ResponseError {
  constructor() {
    super('Nu ați trecut testul reCAPTCHA.', 'ARE_YOU_A_ROBOT_QUESTION_MARK');
  }
}