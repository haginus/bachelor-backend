import { TrimString } from "src/lib/transformers/trim-string.transformer";

export class TopicDto {

  @TrimString()
  name: string;
  
}