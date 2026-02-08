import { IsIntId } from "../../lib/decorators/is-int-id.decorator";
import { PaperDto } from "./paper.dto";

export class CreatePaperDto extends PaperDto {

  @IsIntId()
  studentId: number;

  @IsIntId()
  teacherId: number;
}