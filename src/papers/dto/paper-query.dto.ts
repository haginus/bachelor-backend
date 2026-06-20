import { IsEnum, IsOptional, IsString } from "class-validator";
import { Bool } from "../../lib/decorators/bool.decorator";
import { PaginatedQueryDto } from "../../lib/dto/paginated-query.dto";
import { PaperType } from "../../lib/enums/paper-type.enum";
import { TrimString } from "../../lib/transformers/trim-string.transformer";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";

export class PaperQueryDto extends PaginatedQueryDto {

  @IsOptional()
  @IsEnum(['id', 'title', 'type', 'committee'])
  sortBy: 'id' | 'title' | 'type' | 'committee' = 'id';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Bool()
  submitted?: boolean;

  @IsOptional()
  @Bool()
  assigned?: boolean;

  @IsOptional()
  @IsIntId()
  assignedTo?: number;

  @IsOptional()
  @IsIntId()
  forCommittee?: number;

  @IsOptional()
  @IsEnum(['valid', 'invalid', 'not_validated', 'not_invalid'])
  validity?: 'valid' | 'invalid' | 'not_validated' | 'not_invalid';

  @IsOptional()
  @IsString()
  @TrimString()
  title?: string;

  @IsOptional()
  @IsEnum(PaperType)
  type?: PaperType;

  @IsOptional()
  @IsIntId()
  domainId?: number;

  @IsOptional()
  @IsIntId()
  specializationId?: number;

  @IsOptional()
  @IsString()
  @TrimString()
  studentName?: string;

  @IsOptional()
  @Bool()
  minified?: boolean;
}