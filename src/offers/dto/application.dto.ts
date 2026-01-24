import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ApplicationDto {

  @IsString()
  @MinLength(3)
  @MaxLength(256)
  title: string;

  @IsString()
  @MinLength(64)
  @MaxLength(1024)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  usedTechnologies?: string;

  @IsNotEmpty()
  @IsInt()
  offerId: number;
}