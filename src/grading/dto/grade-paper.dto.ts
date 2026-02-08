import { IsInt, Max, Min } from "class-validator";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";

export class GradePaperDto {

  @IsInt()
  @Min(1)
  @Max(10)
  forPaper: number;

  @IsInt()
  @Min(1)
  @Max(10)
  forPresentation: number;

  @IsIntId()
  paperId: number;

  committeeId: number;

}