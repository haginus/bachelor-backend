import { Expose } from "class-transformer";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";
import { PaperDto } from "./paper.dto";
import { IsOptional } from "class-validator";

export class UpdatePaperDto extends PaperDto {

  @Expose({ groups: ['type:admin'] })
  @IsOptional()
  @IsIntId()
  teacherId?: number;

}