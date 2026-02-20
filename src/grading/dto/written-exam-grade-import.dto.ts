import { IsOptional, IsString, Max, Min } from "class-validator";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";
import { Transform } from "class-transformer";

export class WrittenExamGradeImportDto {

  @IsIntId()
  submissionId: number;

  @IsString()
  studentName: string;

  @IsString()
  domain: string;

  @IsIntId()
  @Min(0)
  @Max(10)
  initialGrade: number;

  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @Min(0)
  @Max(10)
  disputeGrade?: number;
  
}