import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches, MaxLength, ValidateNested } from "class-validator";
import { IsDate } from "../../lib/decorators/date.decorator";
import { CivilState } from "../../lib/enums/civil-state.enum";
import { AddressDto } from "./address.dto";

export class UserExtraDataDto {

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  birthLastName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-ZĂÎȘȚ]\.( [A-ZĂÎȘȚ]\.){0,2}$/)
  parentInitial: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  fatherName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  motherName: string;

  @IsEnum(CivilState)
  civilState: CivilState;

  @IsDate({ stripTime: true })
  dateOfBirth: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  citizenship: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  ethnicity: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  placeOfBirthCountry: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  placeOfBirthCounty: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  placeOfBirthLocality: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^((\+[0-9]{11})|([0-9]{10}))$/)
  landline: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^((\+[0-9]{11})|([0-9]{10}))$/)
  mobilePhone: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  personalEmail: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}