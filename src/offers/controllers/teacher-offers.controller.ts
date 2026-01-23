import { Controller, Get, Query } from "@nestjs/common";
import { TeacherOffersService } from "../services/teacher-offers.service";
import { HydrateUser } from "src/auth/decorators/hydrate-user.decorator";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { Student } from "src/users/entities/user.entity";
import { TeacherOffersQueryDto } from "../dto/teacher-offers-query.dto";

@Controller('teacher-offers')
export class TeacherOffersController {

  constructor(private readonly teacherOffersService: TeacherOffersService) {}

  @HydrateUser()
  @Get()
  async getTeacherOffers(
    @CurrentUser() student: Student, 
    @Query() query: TeacherOffersQueryDto
  ) {
    return this.teacherOffersService.findTeacherOffers(student, query);
  }

}