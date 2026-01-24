import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional } from "class-validator";

export class ApplicationQueryDto {

  @IsOptional()
  @IsEnum(['pending', 'accepted', 'declined'])
  state?: 'pending' | 'accepted' | 'declined';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offerId?: number;

}