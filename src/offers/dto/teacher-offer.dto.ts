import { Expose, Type } from "class-transformer";
import { OfferResponseDto } from "./offer-response.dto";
import { UserResponseDto } from "src/users/dto/user-response.dto";

export class TeacherOfferDto extends UserResponseDto {

  @Expose()
  @Type(() => OfferDto)
  offers: OfferDto[];

}

class OfferDto extends OfferResponseDto {

  @Expose()
  hasApplied: boolean = false;

}