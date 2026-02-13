import { IsEnum, IsOptional } from "class-validator";
import { Bool } from "../../lib/decorators/bool.decorator";

export class TopicQueryDto {
  @IsOptional()
  @IsEnum(['id', 'name', 'offerCount', 'paperCount', 'studentCount'])
  sortBy: 'id' | 'name' | 'offerCount' | 'paperCount' | 'studentCount' = 'id';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection: 'asc' | 'desc' = 'asc';

  @Bool({ optional: true })
  detailed: boolean = false;
}