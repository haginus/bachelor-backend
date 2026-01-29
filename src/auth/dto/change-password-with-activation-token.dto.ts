import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordWithActivationTokenDto {

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}