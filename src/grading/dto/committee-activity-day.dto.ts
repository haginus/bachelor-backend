import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { IsDate } from "../../lib/decorators/date.decorator";

export class CommitteeActivityDayDto {

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  location: string;

  @IsDate()
  startTime: string;
  
}