import { Expose, Type } from "class-transformer";
import { TopicResponseDto } from "src/common/dto/topic-response.dto";
import { UserResponseDto } from "src/users/dto/user-response.dto";

export class OfferResponseDto {

  @Expose()
  id: number;

  @Expose()
  description: string;

  @Expose()
  limit: number;

  @Expose()
  takenSeats: number;

  @Expose()
  teacher: UserResponseDto;

  @Expose()
  @Type(() => TopicResponseDto)
  topics: TopicResponseDto[];

  @Expose()
  pendingApplicationCount: number;
}