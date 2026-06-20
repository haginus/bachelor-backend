import { IsEnum, IsNumberString, IsOptional, IsString } from "class-validator";
import { PaginatedQueryDto } from "../../lib/dto/paginated-query.dto";
import { TrimString } from "../../lib/transformers/trim-string.transformer";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";

export class StudentFilterDto extends PaginatedQueryDto {

  @IsOptional()
  @IsEnum(['id', 'firstName', 'lastName', 'CNP', 'email', 'group', 'domain', 'promotion'])
  sortBy: 'id' | 'firstName' | 'lastName' | 'CNP' | 'email' | 'group' | 'domain' | 'promotion' = 'id';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsIntId()
  domainId?: number;

  @IsOptional()
  @IsIntId()
  specializationId?: number;

  @IsOptional()
  @IsNumberString()
  @TrimString()
  group?: string;

  @IsOptional()
  @IsNumberString()
  @TrimString()
  promotion?: string;

  @IsOptional()
  @IsString()
  @TrimString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @TrimString()
  firstName?: string;

  @IsOptional()
  @IsString()
  @TrimString()
  email?: string;

}