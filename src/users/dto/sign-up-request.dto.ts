import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";
import { FundingForm } from "src/lib/enums/funding-form.enum";
import { TrimString } from "src/lib/transformers/trim-string.transformer";

export class SignUpRequestDto {

  @IsString()
  @IsNotEmpty()
  @TrimString()
  firstName: string;
 
  @IsString()
  @IsNotEmpty()
  @TrimString()
  lastName: string;

  @IsOptional()
  @IsNumberString()
  @TrimString()
  CNP: string | null;

  @IsEmail()
  @IsNotEmpty()
  @TrimString()
  email: string;

  @IsString()
  @IsNotEmpty()
  @TrimString()
  identificationCode: string;

  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  matriculationYear: string;

  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  promotion: string;

  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  group: string;

  @IsEnum(FundingForm)
  @IsNotEmpty()
  fundingForm: FundingForm;

  @IsNotEmpty()
  @IsInt()
  specializationId: number;
}