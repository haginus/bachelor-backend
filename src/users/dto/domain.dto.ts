import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { DomainType } from "../../lib/enums/domain-type.enum";
import { PaperType } from "../../lib/enums/paper-type.enum";
import { SpecializationDto } from "./specialization.dto";
import { Type } from "class-transformer";

export class DomainDto {

  @IsString()
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