import { Transform } from "class-transformer";
import { IsBoolean, IsDate, IsNotEmpty, IsNumberString, IsOptional, IsString, ValidateIf } from "class-validator";
import { stripTime } from "../../lib/utils";

export class SessionSettingsDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sessionName?: string;

  @IsOptional()
  @IsNumberString()
  @IsNotEmpty()
  currentPromotion?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value && stripTime(new Date(value)))
  applyStartDate?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value && stripTime(new Date(value)))
  applyEndDate?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value && stripTime(new Date(value)))
  fileSubmissionStartDate?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value && stripTime(new Date(value)))
  fileSubmissionEndDate?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value && stripTime(new Date(value)))
  paperSubmissionEndDate?: Date;

  @IsOptional()
  @IsBoolean()
  allowPaperGrading?: boolean;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value && stripTime(new Date(value)))
  @ValidateIf((_, v) => v !== null)
  writtenExamDate?: Date | null;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value && stripTime(new Date(value)))
  @ValidateIf((_, v) => v !== null)
  writtenExamDisputeEndDate?: Date | null;

  @IsOptional()
  @IsBoolean()
  writtenExamGradesPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  writtenExamDisputedGradesPublic?: boolean;
}