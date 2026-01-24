import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './entities/paper.entity';
import { Document } from './entities/document.entity';
import { PapersController } from './controllers/papers.controller';
import { PapersService } from './services/papers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Paper,
      Document,
    ]),
  ],
  controllers: [
    PapersController,
  ],
  providers: [
    PapersService,
  ],
})
export class PapersModule {}
