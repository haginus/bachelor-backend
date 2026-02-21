import { IsEnum, IsOptional, IsString } from "class-validator";
import { Bool } from "../../lib/decorators/bool.decorator";
import { PaginatedQueryDto } from "../../lib/dto/paginated-query.dto";
import { TrimString } from "../../lib/transformers/trim-string.transformer";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";

export class SubmissionQueryDto extends PaginatedQueryDto {

  @IsOptional()
  @IsEnum(['id', 'student.fullName', 'student.domain.name', 'writtenExamGrade.initialGrade', 'writtenExamGrade.disputeGrade', 'writtenExamGrade.finalGrade'])
  sortBy: 'id' | 'student.fullName' | 'student.domain.name' | 'writtenExamGrade.initialGrade' | 'writtenExamGrade.disputeGrade' | 'writtenExamGrade.finalGrade' = 'id';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection: 'asc' | 'desc' = 'asc';

  @Bool({ optional: true })
  isSubmitted: boolean = true;

  @Bool({ optional: true })
  hasWrittenExam?: boolean;

  @IsOptional()
  @IsEnum(['not_graded', 'absent', 'graded', 'disputed'])
  writtenExamState?: 'not_graded' | 'absent' | 'graded' | 'disputed';

  @IsIntId({ optional: true })
  domainId?: number;

  @IsOptional()
  @IsString()
  @TrimString()
  studentName?: string;
  
}