import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './entities/offer.entity';
import { Application } from './entities/application.entity';
import { OffersController } from './controllers/offers.controller';
import { OffersService } from './services/offers.service';
import { CommonModule } from '../common/common.module';
import { UsersModule } from '../users/users.module';
import { TeacherOffersService } from './services/teacher-offers.service';
import { TeacherOffersController } from './controllers/teacher-offers.controller';
import { ApplicationsService } from './services/applications.service';
import { ApplicationsController } from './controllers/applications.controller';
import { MailModule } from '../mail/mail.module';
import { PapersModule } from '../papers/papers.module';

@Module({
  imports: [
    CommonModule,
    MailModule,
    UsersModule,
    PapersModule,
    TypeOrmModule.forFeature([
      Offer,
      Application,
    ]),
  ],
  controllers: [
    OffersController,
    TeacherOffersController,
    ApplicationsController,
  ],
  providers: [
    OffersService,
    TeacherOffersService,
    ApplicationsService,
  ]
})
export class OffersModule {}
