import { IsEnum } from "class-validator";
import { UserDto } from "./user.dto";
import { UserType } from "../../lib/enums/user-type.enum";

export class AdminDto extends UserDto {

  @IsEnum([UserType.Admin, UserType.Secretary])
  type: 'admin' | 'secretary';

}