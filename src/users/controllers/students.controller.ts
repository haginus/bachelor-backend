import { Controller, Get, Query } from "@nestjs/common";
import { StudentsService } from "../services/students.service";
import { StudentFilterDto } from "../dto/student-filter.dto";
import { UserType } from "src/lib/enums/user-type.enum";
import { UserTypes } from "src/auth/decorators/user-types.decorator";

@Controller('students')
@UserTypes([UserType.Admin, UserType.Secretary])
export class StudentsController {

  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async findAll(@Query() dto: StudentFilterDto) {
    return this.studentsService.findAll(dto);
  }
}