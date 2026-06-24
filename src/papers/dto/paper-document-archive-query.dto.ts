import { PaperQueryDto } from "./paper-query.dto";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { QueryArray } from "../../lib/decorators/query-array.decorator";

export class PaperDocumentArchiveQueryDto {

  @IsOptional()
  @Type(() => PaperQueryDto)
  @ValidateNested()
  paperFilters?: PaperQueryDto;

  @QueryArray({ optional: true })
  @IsString({ each: true })
  documentNames?: string[];

  @IsOptional()
  @IsEnum(['paper', 'document_name'])
  groupStrategy?: 'paper' | 'document_name';
}