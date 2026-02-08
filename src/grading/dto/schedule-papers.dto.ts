import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional, Max, Min, ValidateIf, ValidateNested } from "class-validator";
import { IsDate } from "../../lib/decorators/date.decorator";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";

export class SchedulePapersDto {

  committeeId: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(30)
  paperPresentationTime?: number;

  @IsOptional()
  @IsBoolean()
  publicScheduling?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaperDto)
  papers?: PaperDto[];
}

class PaperDto {

  @IsIntId()
  paperId: number;

  @ValidateIf((_, v) => v !== null)
  @IsDate()
  scheduledGrading: Date | null;

}