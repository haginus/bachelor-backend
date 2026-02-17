import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './entities/paper.entity';
import { Document } from './entities/document.entity';
import { PapersController } from './controllers/papers.controller';
import { PapersService } from './services/papers.service';
import { CommonModule } from '../common/common.module';
import { RequiredDocumentsService } from './services/required-documents.service';
import { DocumentsService } from './services/documents.service';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentGenerationModule } from '../document-generation/document-generation.module';
import { MailModule } from '../mail/mail.module';
import { DocumentReuploadRequest } from './entities/document-reupload-request.entity';
import { DocumentReuploadRequestsService } from './services/document-reupload-requests.service';
import { DocumentReuploadRequestsController } from './controllers/document-reupload-requests.controller';

@Module({
  imports: [
    CommonModule,
    MailModule,
    DocumentGenerationModule,
    TypeOrmModule.forFeature([
      Paper,
      Document,
      DocumentReuploadRequest,
    ]),
  ],
  controllers: [
    PapersController,
    DocumentsController,
    DocumentReuploadRequestsController,
  ],
  providers: [
    PapersService,
    RequiredDocumentsService,
    DocumentsService,
    DocumentReuploadRequestsService,
  ],
  exports: [
    PapersService,
    RequiredDocumentsService,
    DocumentsService,
  ],
})
export class PapersModule {}
