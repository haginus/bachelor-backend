import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";
import { DocumentType } from "../../lib/enums/document-type.enum";

export class UploadDocumentDto {

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DocumentType)
  type: DocumentType;

  @IsIntId()
  paperId: number;

  file: Express.Multer.File;

}