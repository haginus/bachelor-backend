import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { DomainType } from "../../lib/enums/domain-type.enum";
import { PaperType } from "../../lib/enums/paper-type.enum";
import { SpecializationDto } from "./specialization.dto";
import { Type } from "class-transformer";
import { TrimString } from "../../lib/transformers/trim-string.transformer";

export class DomainDto {

  @IsString()
  @TrimString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DomainType)
  type: DomainType;

  @IsEnum(PaperType)
  paperType: PaperType;

  @IsBoolean()
  hasWrittenExam: boolean;

  @IsArray()
  @IsNotEmpty()
  @Type(() => SpecializationDto)
  specializations: SpecializationDto[];

}