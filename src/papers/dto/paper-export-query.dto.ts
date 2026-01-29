import { Bool } from "src/lib/decorators/bool.decorator";
import { IsIntId } from "src/lib/decorators/is-int-id.decorator";

export class PaperExportQueryDto {

  @Bool({ optional: true })
  onlySubmitted?: boolean;

  @IsIntId({ optional: true })
  teacherId?: number;

}