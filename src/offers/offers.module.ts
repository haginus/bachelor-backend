import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './entities/offer.entity';
import { Application } from './entities/application.entity';
import { OffersController } from './controllers/offers.controller';
import { OffersService } from './services/offers.service';
import { CommonModule } from 'src/common/common.module';
import { UsersModule } from 'src/users/users.module';
import { TeacherOffersService } from './services/teacher-offers.service';
import { TeacherOffersController } from './controllers/teacher-offers.controller';
import { ApplicationsService } from './services/applications.service';
import { ApplicationsController } from './controllers/applications.controller';
import { SessionModule } from 'src/session/session.module';

@Module({
  imports: [
    CommonModule,
    SessionModule,
    UsersModule,
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
