import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Max, Min, ValidateIf } from "class-validator";
import { UserDto } from "./user.dto";
import { FundingForm } from "src/lib/enums/funding-form.enum";
import { TrimString } from "src/lib/transformers/trim-string.transformer";

export class StudentDto extends UserDto {

  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  group: string;

  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  promotion: string;

  @IsString()
  @IsNotEmpty()
  @TrimString()
  identificationCode: string;

  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  matriculationYear: string;

  @IsEnum(FundingForm)
  @IsNotEmpty()
  fundingForm: FundingForm;

  @IsInt()
  @IsNotEmpty()
  specializationId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @ValidateIf((_, v) => v !== null)
  generalAverage: number | null;

}