import { UserType } from "../enums/user-type.enum";

export interface JwtPayload {
  id: number;
  email: string;
  type: UserType;
  _impersonatedBy?: number;
}