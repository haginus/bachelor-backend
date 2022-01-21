import { Expose, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import "reflect-metadata"

export class StudentGetQueryOptions {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  page: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  pageSize: number;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsIn(["ASC", "DESC"])
  order?: 'ASC' | 'DESC' = 'ASC';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  domainId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  specializationId?: number;

  @IsOptional()
  group?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  promotion?: number;

  @Expose()
  get filter() {
    return { domainId: this.domainId, specializationId: this.specializationId, group: this.group, promotion: this.promotion };
  }
}