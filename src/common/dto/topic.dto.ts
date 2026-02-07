import { IsNotEmpty, IsString } from "class-validator";
import { TrimString } from "src/lib/transformers/trim-string.transformer";

export class TopicDto {

  @IsNotEmpty()
  @IsString()
  @TrimString()
  name: string;
  
}