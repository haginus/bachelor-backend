import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './entities/paper.entity';
import { Document } from './entities/document.entity';
import { PapersController } from './controllers/papers.controller';
import { PapersService } from './services/papers.service';
import { CommonModule } from 'src/common/common.module';
import { RequiredDocumentsService } from './services/required-documents.service';
import { DocumentsService } from './services/documents.service';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentGenerationModule } from 'src/document-generation/document-generation.module';
import { Submission } from './entities/submission.entity';

@Module({
  imports: [
    CommonModule,
    DocumentGenerationModule,
    TypeOrmModule.forFeature([
      Paper,
      Document,
      Submission,
    ]),
  ],
  controllers: [
    PapersController,
    DocumentsController,
  ],
  providers: [
    PapersService,
    RequiredDocumentsService,
    DocumentsService,
  ],
  exports: [
    PapersService,
    RequiredDocumentsService,
    DocumentsService,
  ],
})
export class PapersModule {}
