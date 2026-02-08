import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from "class-validator";
import { Bool } from "../../lib/decorators/bool.decorator";
import { QueryArray } from "../../lib/decorators/query-array.decorator";

export class TeacherOffersQueryDto {

  @Bool({ optional: true })
  onlyActive?: boolean;

  @QueryArray({ optional: true, mapFn: (v) => parseInt(v, 10) })
  @IsInt({ each: true })
  topicIds?: number[];

  @Bool({ optional: true })
  isSuggested?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

}