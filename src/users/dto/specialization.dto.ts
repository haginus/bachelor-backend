import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { StudyForm } from "src/lib/enums/study-form.enum";

export class SpecializationDto {

  @IsOptional()
  @IsInt()
  id: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  studyYears: number;

  @IsEnum(StudyForm)
  studyForm: StudyForm;

}