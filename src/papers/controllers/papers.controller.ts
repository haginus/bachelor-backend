import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, SerializeOptions } from "@nestjs/common";
import { PapersService } from "../services/papers.service";
import { Paper } from "../entities/paper.entity";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { PaperQueryDto } from "../dto/paper-query.dto";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { DocumentCategory } from "src/lib/enums/document-category.enum";
import { PaperDto } from "../dto/paper.dto";
import { ValidatePaperDto } from "../dto/validate-paper.dto";

@Controller('papers')
export class PapersController {

  constructor(private readonly papersService: PapersService) {}

  @UserTypes([UserType.Student, UserType.Teacher])
  @Get('me')
  async findMine(
    @CurrentUser() user: any,
  ) {
    return user.type === UserType.Student
      ? this.papersService.findOneByStudent(user.id)
      : this.papersService.findAllByTeacher(user.id).then(papers => (
        papers.map(paper => ({
          ...paper,
          requiredDocuments: paper.requiredDocuments.filter(document => document.category === DocumentCategory.PaperFiles),
          documents: paper.documents.filter(document => document.category === DocumentCategory.PaperFiles)
        }))
      ));
  }

  @Get(':id')
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

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaperDto,
    @CurrentUser() user: any,
  ) {
    return this.papersService.update(id, dto, user);
  }

  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Student])
  @Post(':id/submit')
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.papersService.submit(id, user);
  }

  @Post(':id/unsubmit')
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
}