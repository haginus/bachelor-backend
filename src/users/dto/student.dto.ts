import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Max, Min, ValidateIf } from "class-validator";
import { UserDto } from "./user.dto";
import { FundingForm } from "src/lib/enums/funding-form.enum";

export class StudentDto extends UserDto {

  @IsNumberString()
  @IsNotEmpty()
  group: string;

  @IsNumberString()
  @IsNotEmpty()
  promotion: string;

  @IsString()
  @IsNotEmpty()
  identificationCode: string;

  @IsNumberString()
  @IsNotEmpty()
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