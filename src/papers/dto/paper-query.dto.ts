import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { Bool } from "../../lib/decorators/bool.decorator";
import { PaginatedQueryDto } from "../../lib/dto/paginated-query.dto";
import { PaperType } from "../../lib/enums/paper-type.enum";
import { TrimString } from "../../lib/transformers/trim-string.transformer";

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
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  assignedTo?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  forCommittee?: number;

  @IsOptional()
  @IsEnum(['valid', 'invalid', 'not_validated', 'not_invalid'])
  validity?: 'valid' | 'invalid' | 'not_validated' | 'not_invalid';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(PaperType)
  type?: PaperType;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  domainId?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  specializationId?: number;

  @IsOptional()
  @IsString()
  @TrimString()
  studentName?: string;

  @IsOptional()
  @Bool()
  minified?: boolean;
}