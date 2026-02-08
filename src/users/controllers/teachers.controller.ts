import { Body, Controller, Delete, Get, Param, Post, Put, Query, SerializeOptions, UploadedFile, UseInterceptors } from "@nestjs/common";
import { UserType } from "../../lib/enums/user-type.enum";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { TeachersService } from "../services/teachers.service";
import { TeacherFilterDto } from "../dto/teacher-filter.dto";
import { UserDto } from "../dto/user.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../entities/user.entity";

@Controller('teachers')
@UserTypes([UserType.Admin])
@SerializeOptions({ groups: ['full'] })
export class TeachersController {

  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  async findAll(@Query() dto: TeacherFilterDto) {
    return this.teachersService.findAll(dto);
  }

  @Post()
  async create(
    @Body() dto: UserDto,
    @CurrentUser() user: User,
  ) {
    return this.teachersService.create(dto, user);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.teachersService.import(file.buffer, user);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: UserDto, @CurrentUser() user: User) {
    return this.teachersService.update(id, dto, user);
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @CurrentUser() user: User) {
    return this.teachersService.remove(id, user);
  }
}