import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { UserTypes } from 'src/auth/decorators/user-types.decorator';
import { UserType } from 'src/lib/enums/user-type.enum';

@Controller('reports')
@UserTypes([UserType.Admin, UserType.Secretary])
export class ReportsController {

  constructor(
    private readonly reportsService: ReportsService,
  ) {}

  @Get('files/:fileName')
  async generateCommitteeFile(
    @Param('fileName') fileName: string,
  ) {
    const buffer = await this.reportsService.generateReportFile(fileName);
    return new StreamableFile(buffer);
  }
}
