import { IsEnum, IsOptional } from "class-validator";
import { Bool } from "src/lib/decorators/bool.decorator";

export class TopicQueryDto {
  @IsOptional()
  @IsEnum(['name', 'id'])
  sortBy: 'name' | 'id' = 'id';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection: 'asc' | 'desc' = 'asc';

  @Bool({ optional: true })
  detailed: boolean = false;
}