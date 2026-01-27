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

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      Paper,
      Document,
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
  ],
})
export class PapersModule {}
