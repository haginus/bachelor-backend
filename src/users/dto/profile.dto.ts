import { IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from "class-validator";

export class ProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bio?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(255)
  @ValidateIf((_, v) => v !== '')
  website?: string;

  picture?: Express.Multer.File['buffer'];
}