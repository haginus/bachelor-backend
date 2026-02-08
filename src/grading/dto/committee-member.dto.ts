import { IsEnum, IsInt, IsNotEmpty } from "class-validator";
import { CommitteeMemberRole } from "../../lib/enums/committee-member-role.enum";

export class CommitteeMemberDto {

  @IsNotEmpty()
  @IsInt()
  teacherId: number;

  @IsEnum(CommitteeMemberRole)
  role: CommitteeMemberRole;
}