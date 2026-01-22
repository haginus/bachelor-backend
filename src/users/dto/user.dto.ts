import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { UserType } from "src/lib/enums/user-type.enum";

export class UserDto {

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  CNP: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

}