import { Expose, Type } from "class-transformer";
import { ProfileResponseDto } from "./profile-response.dto";

export class UserResponseDto {

  @Expose()
  id: number;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;

  @Expose()
  @Type(() => ProfileResponseDto)
  profile: ProfileResponseDto;

}