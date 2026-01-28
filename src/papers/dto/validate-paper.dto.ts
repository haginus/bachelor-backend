import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, Max, Min } from "class-validator";

export class ValidatePaperDto {

  paperId: number;

  @IsNotEmpty()
  @IsBoolean()
  isValid: boolean;

  @IsOptional()
  @IsBoolean()
  ignoreRequiredDocuments?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(10)
  generalAverage: number;

}