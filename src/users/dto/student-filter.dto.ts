import { Transform } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";
import { PaginatedQueryDto } from "src/lib/dto/paginated-query.dto";

export class StudentFilterDto extends PaginatedQueryDto {
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  domainId: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  specializationId: number;
}