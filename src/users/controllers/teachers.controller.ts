import { Body, Controller, Delete, Get, Param, Post, Put, Query, SerializeOptions, UploadedFile, UseInterceptors } from "@nestjs/common";
import { UserType } from "src/lib/enums/user-type.enum";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { TeachersService } from "../services/teachers.service";
import { TeacherFilterDto } from "../dto/teacher-filter.dto";
import { UserDto } from "../dto/user.dto";
import { FileInterceptor } from "@nestjs/platform-express";

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
  async create(@Body() dto: UserDto) {
    return this.teachersService.create(dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: Express.Multer.File) {
    return this.teachersService.import(file.buffer);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: UserDto) {
    return this.teachersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.teachersService.remove(id);
  }
}