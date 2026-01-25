import { Body, Controller, Delete, Get, Param, Post, Put, Query, SerializeOptions } from "@nestjs/common";
import { StudentsService } from "../services/students.service";
import { StudentFilterDto } from "../dto/student-filter.dto";
import { UserType } from "src/lib/enums/user-type.enum";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { StudentDto } from "../dto/student.dto";

@Controller('students')
@SerializeOptions({ groups: ['full'] })
@UserTypes([UserType.Admin, UserType.Secretary])
export class StudentsController {

  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async findAll(@Query() dto: StudentFilterDto) {
    return this.studentsService.findAll(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.studentsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: StudentDto) {
    return this.studentsService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: StudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.studentsService.remove(id);
  }
}