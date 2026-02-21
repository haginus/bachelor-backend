import { Controller, Get, Query, StreamableFile } from "@nestjs/common";
import { SubmissionsService } from "../services/submissions.service";
import { SubmissionQueryDto } from "../dto/submission-query.dto";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { UserType } from "../../lib/enums/user-type.enum";

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

  @Get('export/csv')
  async exportCsv() {
    const buffer = await this.submissionsService.exportCsv();
    return new StreamableFile(buffer, { type: 'text/csv', disposition: 'attachment; filename="submissions.csv"' });
  }

}