import { IsEmail, IsIn, IsInt, IsNumberString, IsOptional, IsPositive, IsString, Length, Min, ValidateIf } from "class-validator";
import { FundingForm, StudyForm } from "../../models/models";

export class StudentDto {
  @IsInt()
  @IsOptional()
  id: number;

  @IsString()
  @Length(1, 255)
  firstName: string;

  @IsString()
  @Length(1, 255)
  lastName: string;

  @IsString()
  @Length(13, 13)
  CNP: string;

  @ValidateIf(o => o.id == null)
  @IsEmail()
  email: string;

  @IsString()
  group: string;

  @IsInt()
  @IsPositive()
  specializationId: number;

  @IsString()
  identificationCode: string;

  @IsNumberString()
  promotion: string;

  @IsString()
  @IsIn(["if", "ifr", "id"])
  studyForm: StudyForm;

  @IsString()
  @IsIn(["budget", "tax"])
  fundingForm: FundingForm;

  @IsNumberString()
  matriculationYear: string;
}