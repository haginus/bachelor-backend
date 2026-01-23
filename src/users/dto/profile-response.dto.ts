import { Expose } from "class-transformer";

export class ProfileResponseDto {

  @Expose()
  bio: string;

  @Expose()
  website: string;

  @Expose()
  picture: string;

}