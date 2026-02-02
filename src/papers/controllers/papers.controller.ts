import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, Query, SerializeOptions, StreamableFile, UseInterceptors } from "@nestjs/common";
import { PapersService } from "../services/papers.service";
import { Paper } from "../entities/paper.entity";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { PaperQueryDto } from "../dto/paper-query.dto";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { PaperDto } from "../dto/paper.dto";
import { ValidatePaperDto } from "../dto/validate-paper.dto";
import { DocumentGenerationService } from "src/document-generation/services/document-generation.service";
import { User } from "src/users/entities/user.entity";
import { PaperExportQueryDto } from "../dto/paper-export-query.dto";
import { PaperInterceptor } from "src/auth/interceptors/paper-serializer.interceptor";
import { CreatePaperDto } from "../dto/create-paper.dto";

@Controller('papers')
export class PapersController {

  constructor(
    private readonly papersService: PapersService,
    private readonly documentGenerationService: DocumentGenerationService,
  ) {}

  @UserTypes([UserType.Student, UserType.Teacher])
  @UseInterceptors(PaperInterceptor())
  @Get('me')
  async findMine(
    @CurrentUser() user: any,
  ) {
    return user.type === UserType.Student
      ? this.papersService.findOneByStudent(user.id)
      : this.papersService.findAllByTeacher(user.id);
  }

  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Teacher])
  @Get('export/excel')
  async exportExcel(
    @Query() query: PaperExportQueryDto,
    @CurrentUser() user: User,
  ) {
    if(user.type === UserType.Teacher && (!query.teacherId || query.teacherId !== user.id)) {
      throw new ForbiddenException();
    }
    const buffer = await this.documentGenerationService.generatePapersXlsx({ 
      onlySubmitted: query.onlySubmitted,
      teacherId: query.teacherId,
      fullStudent: user.type !== UserType.Teacher,
    });
    return new StreamableFile(buffer, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  @Get(':id')
  @UseInterceptors(PaperInterceptor())
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ): Promise<Paper> {
    return this.papersService.findOne(id, user);
  }

  @SerializeOptions({ groups: ['full'] })
  @UserTypes([UserType.Admin, UserType.Secretary])
  @Get()
  async findAll(@Query() query: PaperQueryDto): Promise<Paginated<Paper>> {
    return this.papersService.findAll(query);
  }

  @Post()
  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Teacher])
  @UseInterceptors(PaperInterceptor())
  async create(
    @Body() dto: CreatePaperDto,
    @CurrentUser() user: any,
  ) {
    return this.papersService.create(dto, user);
  }

  @Put(':id')
  @UseInterceptors(PaperInterceptor((data) => data.result))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaperDto,
    @CurrentUser() user: any,
  ) {
    return this.papersService.update(id, dto, user);
  }

  @Post(':id/submit')
  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Student])
  @UseInterceptors(PaperInterceptor())
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.papersService.submit(id, user);
  }

  @Post(':id/unsubmit')
  @UseInterceptors(PaperInterceptor())
  async unsubmit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.papersService.unsubmit(id, user);
  }

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Post(':id/validate')
  async validate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValidatePaperDto,
  ) {
    dto.paperId = id;
    return this.papersService.validate(dto);
  }

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Post(':id/undo-validation')
  async undoValidation(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.papersService.undoValidation(id);
  }

  @UserTypes([UserType.Teacher])
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.papersService.delete(id, user);
  }

}