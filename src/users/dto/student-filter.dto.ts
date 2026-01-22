import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsNumberString, IsOptional, IsString } from "class-validator";
import { PaginatedQueryDto } from "src/lib/dto/paginated-query.dto";
import { TrimString } from "src/lib/transformers/trim-string.transformer";

export class StudentFilterDto extends PaginatedQueryDto {

  @IsOptional()
  @IsEnum(['id', 'firstName', 'lastName', 'CNP', 'email', 'group', 'domain', 'promotion'])
  sortBy: 'id' | 'firstName' | 'lastName' | 'CNP' | 'email' | 'group' | 'domain' | 'promotion' = 'id';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  domainId: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  specializationId: number;

  @IsOptional()
  @IsNumberString()
  @TrimString()
  group: string;

  @IsOptional()
  @IsNumberString()
  @TrimString()
  promotion: string;

  @IsOptional()
  @IsString()
  @TrimString()
  lastName: string;

  @IsOptional()
  @IsString()
  @TrimString()
  firstName: string;

  @IsOptional()
  @IsString()
  @TrimString()
  email: string;

}