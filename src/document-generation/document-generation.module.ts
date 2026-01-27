import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { DocumentGenerationService } from './document-generation.service';

@Module({
  imports: [CommonModule],
  providers: [DocumentGenerationService],
})
export class DocumentGenerationModule {}
