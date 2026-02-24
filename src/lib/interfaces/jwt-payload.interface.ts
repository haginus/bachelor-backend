import { UserType } from "../enums/user-type.enum";

export interface JwtPayload {
  rti: number;
  id: number;
  email: string;
  type: UserType;
  _impersonatedBy?: number;
}