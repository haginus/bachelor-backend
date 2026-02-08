import { Transform } from "class-transformer";
import { IsBoolean, IsDate, IsNotEmpty, IsNumberString, IsString } from "class-validator";
import { stripTime } from "../../lib/utils";

export class SessionSettingsDto {

  @IsString()
  @IsNotEmpty()
  sessionName: string;

  @IsNumberString()
  @IsNotEmpty()
  currentPromotion: string;

  @IsDate()
  @Transform(({ value }) => stripTime(new Date(value)))
  applyStartDate: Date;

  @IsDate()
  @Transform(({ value }) => stripTime(new Date(value)))
  applyEndDate: Date;

  @IsDate()
  @Transform(({ value }) => stripTime(new Date(value)))
  fileSubmissionStartDate: Date;

  @IsDate()
  @Transform(({ value }) => stripTime(new Date(value)))
  fileSubmissionEndDate: Date;

  @IsDate()
  @Transform(({ value }) => stripTime(new Date(value)))
  paperSubmissionEndDate: Date;

  @IsBoolean()
  allowGrading: boolean;
}