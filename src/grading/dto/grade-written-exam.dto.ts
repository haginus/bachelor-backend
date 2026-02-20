import { IsInt, IsOptional, Max, Min } from "class-validator";

export class GradeWrittenExamDto {

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  initialGrade?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  disputeGrade?: number;
  
}