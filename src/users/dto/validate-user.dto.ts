import { IsArray, IsInt, IsOptional } from "class-validator";

export class ValidateUserDto {

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  topicIds?: number[];

}