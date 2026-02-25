import { IsEnum, IsOptional } from "class-validator";
import { UserType } from "../../lib/enums/user-type.enum";

export class AdminQueryDto {

  @IsOptional()
  @IsEnum([UserType.Admin, UserType.Secretary])
  type?: 'admin' | 'secretary';

}