import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './entities/offer.entity';
import { Application } from './entities/application.entity';
import { OffersController } from './controllers/offers.controller';
import { OffersService } from './services/offers.service';
import { CommonModule } from 'src/common/common.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    CommonModule,
    UsersModule,
    TypeOrmModule.forFeature([
      Offer,
      Application,
    ]),
  ],
  controllers: [
    OffersController,
  ],
  providers: [
    OffersService,
  ]
})
export class OffersModule {}
