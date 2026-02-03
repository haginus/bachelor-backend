import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, Query, SerializeOptions, UploadedFile, UseInterceptors } from "@nestjs/common";
import { StudentsService } from "../services/students.service";
import { StudentFilterDto } from "../dto/student-filter.dto";
import { UserType } from "src/lib/enums/user-type.enum";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { StudentDto } from "../dto/student.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "../entities/user.entity";
import { SessionSettingsService } from "src/common/services/session-settings.service";
import { instanceToPlain } from "class-transformer";

@Controller('students')
@SerializeOptions({ groups: ['full'] })
@UserTypes([UserType.Admin, UserType.Secretary])
export class StudentsController {

  constructor(
    private readonly studentsService: StudentsService,
    private readonly sessionSettingsService: SessionSettingsService,
  ) {}

  @Get()
  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Teacher])
  async findAll(
    @Query() dto: StudentFilterDto,
    @CurrentUser() user: User,
  ) {
    if(user.type === UserType.Teacher) {
      if(!await this.sessionSettingsService.canApply()) {
        throw new ForbiddenException('Nu puteți căuta studenți în afara perioadei de asociere.');
      }
      const students = await this.studentsService.findAll(dto);
      return instanceToPlain(students);  
    }
    return this.studentsService.findAll(dto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: StudentDto,
    @CurrentUser() user: User,
  ) {
    return this.studentsService.create(dto, user);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Body('specializationId', ParseIntPipe) specializationId: number,
    @CurrentUser() user: User,
  ) {
    return this.studentsService.import(file.buffer, specializationId, user);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StudentDto,
    @CurrentUser() user: User
  ) {
    return this.studentsService.update(id, dto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User
  ) {
    return this.studentsService.remove(id, user);
  }
}