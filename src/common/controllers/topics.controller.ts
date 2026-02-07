import { Body, Controller, Delete, Get, Param, ParseArrayPipe, ParseIntPipe, Post, Put, Query } from "@nestjs/common";
import { TopicsService } from "../services/topics.service";
import { TopicDto } from "../dto/topic.dto";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { TopicQueryDto } from "../dto/topic-query.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "src/users/entities/user.entity";

@Controller('topics')
export class TopicsController {

  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  async findAll(
    @Query() query: TopicQueryDto,
    @CurrentUser() user: User,
  ) {
    if(query.detailed && user.type !== UserType.Admin) {
      query.detailed = false;
    }
    return this.topicsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.topicsService.findOne(id);
  }

  @UserTypes([UserType.Admin, UserType.Teacher])
  @Post()
  async create(@Body() dto: TopicDto) {
    return this.topicsService.create(dto);
  }

  @UserTypes([UserType.Admin, UserType.Teacher])
  @Post('bulk')
  async bulkCreate(@Body() dtos: TopicDto[]) {
    return this.topicsService.bulkCreate(dtos);
  }

  @UserTypes([UserType.Admin])
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: TopicDto) {
    return this.topicsService.update(id, dto);
  }

  @UserTypes([UserType.Admin])
  @Delete('bulk')
  async bulkDelete(
    @Query('ids', new ParseArrayPipe({ items: Number })) ids: number[],
    @Query('moveToId', new ParseIntPipe({ optional: true })) moveToId?: number
  ) {
    return this.topicsService.bulkDelete(ids, moveToId);
  }

  @UserTypes([UserType.Admin])
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Query('moveToId', new ParseIntPipe({ optional: true })) moveToId?: number
  ) {
    return this.topicsService.delete(id, moveToId);
  }
}