import { IsEnum, IsInt, IsNotEmpty, IsNumberString, IsString } from "class-validator";
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

}