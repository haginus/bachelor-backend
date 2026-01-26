import { Transform } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString } from "class-validator";
import { Bool } from "src/lib/decorators/bool.decorator";
import { PaginatedQueryDto } from "src/lib/dto/paginated-query.dto";
import { PaperType } from "src/lib/enums/paper-type.enum";
import { TrimString } from "src/lib/transformers/trim-string.transformer";

export class PaperQueryDto extends PaginatedQueryDto {

  @IsOptional()
  @IsEnum(['id', 'title', 'committee'])
  sortBy: 'id' | 'title' | 'committee' = 'id';

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