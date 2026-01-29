import { OmitType } from "@nestjs/swagger";
import { StudentDto } from "./student.dto";
import { IsEnum, IsNotEmpty } from "class-validator";
import { FundingForm } from "src/lib/enums/funding-form.enum";
import { Transform } from "class-transformer";
import { unaccent } from "src/lib/utils";

export class StudentCsvDto extends OmitType(StudentDto, ['specializationId', 'fundingForm'] as const) {

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
  fundingForm: FundingForm;
  
}