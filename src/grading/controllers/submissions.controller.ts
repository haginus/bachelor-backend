import { Controller, Get, Param, ParseIntPipe, Post, Query, StreamableFile, UseInterceptors } from "@nestjs/common";
import { SubmissionsService } from "../services/submissions.service";
import { SubmissionQueryDto } from "../dto/submission-query.dto";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { UserType } from "../../lib/enums/user-type.enum";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../../users/entities/user.entity";
import { WrittenExamGradesSerializer } from "../../auth/interceptors/written-exam-grades-serializer.interceptor";

@Controller('submissions')
export class SubmissionsController {

  constructor(
    private readonly submissionsService: SubmissionsService,
  ) {}

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Get()
  @UseInterceptors(WrittenExamGradesSerializer)
  findAll(@Query() query: SubmissionQueryDto) {
    return this.submissionsService.findAll(query);
  }

  @UserTypes([UserType.Admin, UserType.Secretary])
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

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Get(':id')
  @UseInterceptors(WrittenExamGradesSerializer)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.findOne(id);
  }

  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Student])
  @UseInterceptors(WrittenExamGradesSerializer)
  @Post(':id/submit')
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.submit(id, user);
  }

  @Post(':id/unsubmit')
  @UseInterceptors(WrittenExamGradesSerializer)
  async unsubmit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.unsubmit(id, user);
  }

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Get('export/csv')
  async exportCsv() {
    const buffer = await this.submissionsService.exportCsv();
    return new StreamableFile(buffer, { type: 'text/csv', disposition: 'attachment; filename="submissions.csv"' });
  }

}