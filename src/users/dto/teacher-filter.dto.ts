import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginatedQueryDto } from "src/lib/dto/paginated-query.dto";
import { TrimString } from "src/lib/transformers/trim-string.transformer";

export class TeacherFilterDto extends PaginatedQueryDto {

  @IsOptional()
  @IsEnum(['id', 'firstName', 'lastName', 'email', 'offerCount', 'paperCount', 'plagiarismReportCount'])
  sortBy: 'id' | 'firstName' | 'lastName' | 'email' | 'offerCount' | 'paperCount' | 'plagiarismReportCount' = 'id';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection: 'asc' | 'desc' = 'asc';

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