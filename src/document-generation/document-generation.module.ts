import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { DocumentGenerationService } from './services/document-generation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signature } from './entities/signature.entity';
import { SignaturesController } from './controllers/signatures.controller';
import { SignaturesService } from './services/signatures.service';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([Signature]),
  ],
  controllers: [
    SignaturesController
  ],
  providers: [
    DocumentGenerationService,
    SignaturesService,
  ],
  exports: [
    DocumentGenerationService,
    SignaturesService,
  ],
})
export class DocumentGenerationModule {}
