import { Controller, Get, Param, ParseIntPipe, Query, StreamableFile, UseInterceptors } from "@nestjs/common";
import { SubmissionsService } from "../services/submissions.service";
import { SubmissionQueryDto } from "../dto/submission-query.dto";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { UserType } from "../../lib/enums/user-type.enum";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../../users/entities/user.entity";
import { WrittenExamGradesSerializer } from "../../auth/interceptors/written-exam-grades-serializer.interceptor";

@Controller('submissions')
@UserTypes([UserType.Admin, UserType.Secretary])
export class SubmissionsController {

  constructor(
    private readonly submissionsService: SubmissionsService,
  ) {}

  @Get()
  findAll(@Query() query: SubmissionQueryDto) {
    return this.submissionsService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.submissionsService.getStats();
  }

  @UserTypes(UserType.Student)
  @UseInterceptors(WrittenExamGradesSerializer)
  @Get('me')
  findMine(@CurrentUser() user: User) {
    return this.submissionsService.findOneByStudentId(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.findOne(id);
  }

  @Get('export/csv')
  async exportCsv() {
    const buffer = await this.submissionsService.exportCsv();
    return new StreamableFile(buffer, { type: 'text/csv', disposition: 'attachment; filename="submissions.csv"' });
  }

}