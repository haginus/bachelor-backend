import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, Query, SerializeOptions, StreamableFile, UseInterceptors } from "@nestjs/common";
import { PapersService } from "../services/papers.service";
import { Paper } from "../entities/paper.entity";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { UserType } from "../../lib/enums/user-type.enum";
import { PaperQueryDto } from "../dto/paper-query.dto";
import { Paginated } from "../../lib/interfaces/paginated.interface";
import { PaperDto } from "../dto/paper.dto";
import { ValidatePaperDto } from "../dto/validate-paper.dto";
import { DocumentGenerationService } from "../../document-generation/services/document-generation.service";
import { User } from "../../users/entities/user.entity";
import { PaperExportQueryDto } from "../dto/paper-export-query.dto";
import { PaperInterceptor } from "../../auth/interceptors/paper-serializer.interceptor";
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
  @Get('export/xlsx')
  async exportXlsx(
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

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Post(':id/validate')
  async validate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValidatePaperDto,
    @CurrentUser() user: any,
  ) {
    dto.paperId = id;
    return this.papersService.validate(dto, user);
  }

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Post(':id/undo-validation')
  async undoValidation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.papersService.undoValidation(id, user);
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