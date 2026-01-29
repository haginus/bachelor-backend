import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { TrimString } from "src/lib/transformers/trim-string.transformer";

export class UserDto {

  @IsOptional()
  @IsString()
  @TrimString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  @TrimString()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @TrimString()
  lastName: string;

  @IsOptional()
  @IsString()
  @TrimString()
  CNP?: string | null;

  @IsEmail()
  @IsNotEmpty()
  @TrimString()
  email: string;

}