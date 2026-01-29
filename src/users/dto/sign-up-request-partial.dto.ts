import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Max, Min, ValidateIf } from "class-validator";
import { FundingForm } from "src/lib/enums/funding-form.enum";
import { TrimString } from "src/lib/transformers/trim-string.transformer";

export class SignUpRequestPartialDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @TrimString()
  firstName: string;
 
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @TrimString()
  lastName: string;

  @IsOptional()
  @IsNumberString()
  @TrimString()
  CNP: string | null;

  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  @TrimString()
  email: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @TrimString()
  identificationCode: string;

  @IsOptional()
  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  matriculationYear: string;

  @IsOptional()
  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  promotion: string;

  @IsOptional()
  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  group: string;

  @IsOptional()
  @IsEnum(FundingForm)
  @IsNotEmpty()
  fundingForm: FundingForm;

  @IsOptional()
  @IsNotEmpty()
  @IsInt()
  specializationId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @ValidateIf((_, v) => v !== null)
  generalAverage: number | null;
}