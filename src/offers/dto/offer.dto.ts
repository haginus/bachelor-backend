import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class OfferDto {

  @IsInt()
  @Min(1)
  limit: number;

  @IsInt()
  @IsNotEmpty()
  domainId: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  topicIds: number[];

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  description: string;

  teacherId: number;

}