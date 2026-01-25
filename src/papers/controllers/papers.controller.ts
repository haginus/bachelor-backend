import { Controller, Get, Query } from "@nestjs/common";
import { PapersService } from "../services/papers.service";
import { Paper } from "../entities/paper.entity";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { PaperQueryDto } from "../dto/paper-query.dto";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { DocumentCategory } from "src/lib/enums/document-category.enum";

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

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Get()
  async findAll(@Query() query: PaperQueryDto): Promise<Paginated<Paper>> {
    return this.papersService.findAll(query);
  }
}