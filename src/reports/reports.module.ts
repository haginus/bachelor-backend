import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DocumentGenerationModule } from 'src/document-generation/document-generation.module';

@Module({
  imports: [DocumentGenerationModule],
  providers: [ReportsService],
  controllers: [ReportsController]
})
export class ReportsModule {}
