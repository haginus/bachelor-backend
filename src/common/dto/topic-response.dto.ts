import { Expose } from "class-transformer";

export class TopicResponseDto {

  @Expose()
  id: number;

  @Expose()
  name: string;
  
}