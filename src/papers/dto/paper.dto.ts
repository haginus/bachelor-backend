import { ArrayMinSize, IsArray, IsInt, IsString, MaxLength, MinLength } from "class-validator";

export class PaperDto {

  @IsString()
  @MinLength(3)
  @MaxLength(256)
  title: string;

  @IsString()
  @MinLength(64)
  @MaxLength(1024)
  description: string;

  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  topicIds: number[];
}