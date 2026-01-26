import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { CommitteeActivityDayDto } from "./committee-activity-day.dto";
import { CommitteeMemberDto } from "./committee-member.dto";

export class CommitteeDto {

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  domainIds: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitteeActivityDayDto)
  activityDays: CommitteeActivityDayDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CommitteeMemberDto)
  members: CommitteeMemberDto[];
}