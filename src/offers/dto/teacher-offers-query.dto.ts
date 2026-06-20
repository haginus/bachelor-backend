import { IsInt, IsOptional, IsString } from "class-validator";
import { Bool } from "../../lib/decorators/bool.decorator";
import { QueryArray } from "../../lib/decorators/query-array.decorator";
import { TrimString } from "../../lib/transformers/trim-string.transformer";

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
  @TrimString()
  search?: string;

}