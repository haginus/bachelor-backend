import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from "@nestjs/common";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { ApplicationsService } from "../services/applications.service";
import { Student, User } from "src/users/entities/user.entity";
import { ApplicationQueryDto } from "../dto/application-query.dto";
import { ApplicationDto } from "../dto/application.dto";
import { HydrateUser } from "src/auth/decorators/hydrate-user.decorator";

@Controller('applications')
export class ApplicationsController {

  constructor(private readonly applicationsService: ApplicationsService) {}

  @UserTypes([UserType.Teacher, UserType.Student])
  @Get('me')
  findTeacherOffers(
    @CurrentUser() user: User,
    @Query() query: ApplicationQueryDto,
  ) {
    return user.type === UserType.Student
      ? this.applicationsService.findAllByStudent(user.id, query)
      : this.applicationsService.findAllByTeacher(user.id, query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.findOne(id, user);
  }

  @Post()
  @HydrateUser()
  @UserTypes([UserType.Student])
  createApplication(
    @Body() dto: ApplicationDto,
    @CurrentUser() user: Student,
  ) {
    return this.applicationsService.create(dto, user);
  }

  @UserTypes([UserType.Teacher])
  @Post(':id/accept')
  acceptApplication(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.accept(id, user);
  }

  @UserTypes([UserType.Teacher])
  @Post(':id/decline')
  declineApplication(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.decline(id, user);
  }

  @UserTypes([UserType.Student])
  @Delete(':id')
  withdrawApplication(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.withdraw(id, user);
  }

}