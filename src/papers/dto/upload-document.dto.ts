import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { IsIntId } from "src/lib/decorators/is-int-id.decorator";
import { DocumentType } from "src/lib/enums/document-type.enum";

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