import { IsNotEmpty, IsString } from "class-validator";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";

export class SignDocumentDto {

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIntId()
  paperId: number;

}