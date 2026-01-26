import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class AddressDto {

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  country: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  county: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  locality: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  street: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  streetNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  building: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  stair: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  floor: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  apartment: string;
}