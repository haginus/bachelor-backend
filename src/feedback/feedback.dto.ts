import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";
import { FeedbackType } from "../lib/enums/feedback-type.enum";

class FeedbackUserDto {

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  lastName: string;
  
}

export class FeedbackDto {

  @IsEnum(FeedbackType)
  type: FeedbackType;

  @IsString()
  @MinLength(16)
  @MaxLength(1024)
  description: string;

  @IsEmail()
  @IsNotEmpty()
  replyToEmail: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeedbackUserDto)
  user: FeedbackUserDto;
}

