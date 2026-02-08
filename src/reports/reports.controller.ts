import { Controller, Get, HttpCode, MessageEvent, Param, Post, Sse, StreamableFile } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { UserTypes } from '../auth/decorators/user-types.decorator';
import { UserType } from '../lib/enums/user-type.enum';
import { map, Observable } from 'rxjs';

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

  @Sse('final-report')
  getFinalReportStatus(): Observable<MessageEvent> {
    return this.reportsService.getFinalReportGenerationStatus().pipe(
      map(data => ({ data })),
    );
  }

  @HttpCode(204)
  @Post('final-report/generate')
  generateFinalReport() {
    this.reportsService.generateFinalReport();
  }

  @Get('final-report/download')
  getFinalReport() {
    return this.reportsService.getFinalReport();
  }
}
