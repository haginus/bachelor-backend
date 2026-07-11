import { IsOptional, IsString, Max, Min } from "class-validator";
import { IsIntId } from "../../lib/decorators/is-int-id.decorator";
import { Transform } from "class-transformer";
import { CsvColumn } from "../../lib/decorators/csv-column.decorator";

export class WrittenExamGradeImportDto {

  @CsvColumn({
    order: 1,
    entityPropertyPath: 'submissionId',
    name: 'ID înscriere',
    required: true,
    description: 'ID-ul înscrierii a studentului (precompletat)',
    type: 'number',
    example: 123
  })
  @IsIntId()
  submissionId!: number;

  @CsvColumn({
    order: 2,
    entityPropertyPath: 'submission.student.identificationCode',
    name: 'Număr matricol',
    required: true,
    description: 'Numărul matricol al studentului (precompletat)',
    type: 'string',
    example: '1/2023'
  })
  @IsString()
  studentIdentificationCode!: string;

  @CsvColumn({
    order: 3,
    entityPropertyPath: 'submission.student.fullName',
    name: 'Nume student',
    required: true,
    description: 'Numele complet al studentului (precompletat)',
    type: 'string',
    example: 'Popescu Ion'
  })
  @IsString()
  studentName!: string;

  @CsvColumn({
    order: 4,
    entityPropertyPath: 'submission.student.specialization.domain.name',
    name: 'Domeniu',
    required: true,
    description: 'Domeniul studentului (precompletat)',
    type: 'string',
    example: 'Informatica'
  })
  @IsString()
  domain!: string;

  @CsvColumn({
    order: 5,
    entityPropertyPath: 'initialGrade',
    name: 'Notă inițială',
    required: true,
    description: 'Număr întreg între 1 și 10 ce determină nota inițială la proba scrisă. Folosiți 0 pentru a marca studentul ca absent.',
    type: 'number(int)',
    example: [0, 10]
  })
  @IsIntId({ min: 0 })
  @Max(10)
  initialGrade!: number;

  @CsvColumn({
    order: 5,
    entityPropertyPath: 'disputeGrade',
    name: 'Notă contestație',
    required: true,
    description: 'Număr întreg între 1 și 10 ce determină nota după contestație la proba scrisă.',
    type: 'number(int)',
    example: 10
  })
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @Min(0)
  @Max(10)
  disputeGrade?: number;
  
}