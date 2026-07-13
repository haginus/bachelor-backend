import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { TrimString } from "../../lib/transformers/trim-string.transformer";
import { CsvColumn } from "../../lib/decorators/csv-column.decorator";
import { IsCnp } from "../../lib/validators/is-cnp.validator";

export class TeacherImportDto {

  @CsvColumn({
    order: 1,
    entityPropertyPath: 'title',
    name: 'Titlu',
    required: false,
    description: 'Titlul academic al profesorului',
    type: 'string',
    anyOf: ['Prof.univ.dr.', 'Conf.univ.dr.', 'Lect.univ.dr.', 'Asist.dr.', 'Asist.drd.', 'Asist.(det.) drd.', 'Drd.'],
    example: 'Prof.univ.dr.'
  })
  @IsString()
  @IsOptional()
  @TrimString()
  title?: string;

  @CsvColumn({
    order: 2,
    entityPropertyPath: 'lastName',
    name: 'Nume',
    required: true,
    description: 'Numele de familie al profesorului',
    type: 'string',
    example: 'Popescu'
  })
  @IsString()
  @IsNotEmpty()
  @TrimString()
  lastName!: string;

  @CsvColumn({
    order: 3,
    entityPropertyPath: 'firstName',
    name: 'Prenume',
    required: true,
    description: 'Prenumele profesorului',
    type: 'string',
    example: 'Ion'
  })
  @IsString()
  @IsNotEmpty()
  @TrimString()
  firstName!: string;

  @CsvColumn({
    order: 4,
    entityPropertyPath: 'CNP',
    name: 'CNP',
    required: false,
    description: 'Codul numeric personal al profesorului, dacă acesta are unul',
    type: 'string',
    example: '2910706125181'
  })
  @IsOptional()
  @IsCnp()
  @TrimString()
  CNP?: string | null;

  @CsvColumn({
    order: 5,
    entityPropertyPath: 'email',
    name: 'E-mail',
    required: true,
    description: 'Adresa de e-mail a profesorului',
    type: 'string',
    example: 'ion.popescu@unibuc.ro'
  })
  @IsEmail()
  @IsNotEmpty()
  @TrimString()
  email!: string;
  
}