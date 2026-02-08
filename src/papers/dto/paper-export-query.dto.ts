import { Bool } from "../../lib/decorators/bool.decorator";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";

export class PaperExportQueryDto {

  @Bool({ optional: true })
  onlySubmitted?: boolean;

  @IsIntId({ optional: true })
  teacherId?: number;

}