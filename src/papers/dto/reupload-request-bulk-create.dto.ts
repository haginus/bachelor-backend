import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator";
import { IsDate } from "../../lib/decorators/date.decorator";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";

export class DocumentReuploadRequestBulkCreateDto {

  @IsIntId()
  paperId: number;

  @ValidateNested({ each: true })
  @Type(() => DocumentReuploadRequestDto)
  requests: DocumentReuploadRequestDto[];
}

class DocumentReuploadRequestDto {

  @IsString()
  @IsNotEmpty()
  documentName: string;

  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => v !== null)
  comment: string | null;

  @IsDate({ stripTime: true })
  deadline: Date;
}

