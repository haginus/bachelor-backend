import { IsEmail, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";
import { FundingForm } from "../../lib/enums/funding-form.enum";
import { Transform } from "class-transformer";
import { unaccent } from "../../lib/utils";
import { TrimString } from "../../lib/transformers/trim-string.transformer";
import { CsvColumn } from "../../lib/decorators/csv-column.decorator";
import { IsCnp } from "../../lib/validators/is-cnp.validator";

export class StudentImportDto {

  @CsvColumn({
    order: 1,
    entityPropertyPath: 'lastName',
    name: 'Nume',
    required: true,
    description: 'Numele de familie al studentului',
    type: 'string',
    example: 'Popescu'
  })
  @IsString()
  @IsNotEmpty()
  @TrimString()
  lastName!: string;

  @CsvColumn({
    order: 2,
    entityPropertyPath: 'firstName',
    name: 'Prenume',
    required: true,
    description: 'Prenumele studentului',
    type: 'string',
    example: 'Ion'
  })
  @IsString()
  @IsNotEmpty()
  @TrimString()
  firstName!: string;

  @CsvColumn({
    order: 3,
    entityPropertyPath: 'CNP',
    name: 'CNP',
    required: false,
    description: 'Codul numeric personal al studentului, dacă acesta are unul',
    type: 'string',
    example: '2910706125181'
  })
  @IsOptional()
  @TrimString()
  @IsCnp()
  CNP?: string | null;

  @CsvColumn({
    order: 4,
    entityPropertyPath: 'email',
    name: 'E-mail',
    required: true,
    description: 'Adresa de e-mail a studentului',
    type: 'string',
    example: 'ion.popescu@s.unibuc.ro'
  })
  @IsEmail()
  @IsNotEmpty()
  @TrimString()
  email!: string;

  @CsvColumn({
    order: 5,
    entityPropertyPath: 'group',
    name: 'Grupă',
    required: true,
    description: 'Grupa studentului',
    type: 'string',
    example: '131'
  })
  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  group!: string;


  @CsvColumn({
    order: 6,
    entityPropertyPath: 'promotion',
    name: 'Promoție',
    required: true,
    description: 'Promoția studentului, adică anul în care a terminat studiile universitare',
    type: 'string',
    example: '2026'
  })
  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  promotion!: string;

  @CsvColumn({
    order: 7,
    entityPropertyPath: 'identificationCode',
    name: 'Număr matricol',
    required: true,
    description: 'Numărul matricol al studentului',
    type: 'string',
    example: '123/2023'
  })
  @IsString()
  @IsNotEmpty()
  @TrimString()
  identificationCode!: string;

  @CsvColumn({
    order: 8,
    entityPropertyPath: 'matriculationYear',
    name: 'An înmatriculare',
    required: true,
    description: 'Anul în care studentul s-a înmatriculat la facultate',
    type: 'string',
    example: '2023'
  })
  @IsNumberString()
  @IsNotEmpty()
  @TrimString()
  matriculationYear!: string;

  @CsvColumn({
    order: 9,
    entityPropertyPath: 'fundingForm',
    name: 'Formă finanțare',
    required: true,
    description: 'Forma de finanțare a studentului, buget sau taxă',
    anyOf: ['buget', 'taxă'],
    type: 'string',
    example: 'buget'
  })
  @IsEnum(FundingForm, { message: 'Forma de finanțare trebuie să fie buget/taxă.' })
  @IsNotEmpty()
  @Transform(({ value }) => {
    const formattedValue = unaccent(value.toString().toLowerCase().trim());
    if(formattedValue === 'buget') {
      return FundingForm.Budget;
    } else if(formattedValue === 'taxa') {
      return FundingForm.Tax;
    }
    return value;
  })
  fundingForm!: FundingForm;
  
}