import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateIf } from "class-validator";
import { StudyForm } from "../../lib/enums/study-form.enum";
import { TrimString } from "../../lib/transformers/trim-string.transformer";

export class SpecializationDto {

  @IsOptional()
  @IsInt()
  id: number;

  @IsString()
  @IsNotEmpty()
  @TrimString()
  name: string;

  @IsOptional()
  @IsString()
  @TrimString()
  catalogName?: string;

  @IsInt()
  @Min(1)
  studyYears: number;

  @IsEnum(StudyForm)
  studyForm: StudyForm;

  @IsInt()
  @ValidateIf((_, v) => v !== null)
  secretaryId: number | null;

}