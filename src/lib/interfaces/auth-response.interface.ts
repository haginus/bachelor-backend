import { User } from "src/users/entities/user.entity";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  error?: any;
}