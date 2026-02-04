import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { UserTypesGuard } from './auth/guards/user-types.guard';
import { UserHydrationInterceptor } from './auth/interceptors/user-hydration.interceptor';
import { CommonModule } from './common/common.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { safePath } from './lib/utils';
import { SudoGuard } from './auth/guards/sudo.guard';
import { OffersModule } from './offers/offers.module';
import { ApplicationSubscriber } from './offers/subscribers/application.subscriber';
import { MailModule } from './mail/mail.module';
import { PapersModule } from './papers/papers.module';
import { GradingModule } from './grading/grading.module';
import { DocumentGenerationModule } from './document-generation/document-generation.module';
import { CsvModule } from './csv/csv.module';
import { StatisticsModule } from './statistics/statistics.module';
import { GoogleRecaptchaModule, GoogleRecaptchaNetwork } from '@nestlab/google-recaptcha';
import { ReportsModule } from './reports/reports.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: safePath(process.cwd(), 'static'),
      serveRoot: '/static/',
    }),
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secretKey = configService.get('RECAPTCHA_SECRET_KEY');
        return {
          secretKey,
          response: req => req.headers['recaptcha'],
          network: GoogleRecaptchaNetwork.Recaptcha,
          skipIf: () => process.env.NODE_ENV !== 'production' || !secretKey,
        }
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        database: configService.get('DATABASE_NAME'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        autoLoadEntities: true,
        subscribers: [ApplicationSubscriber],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    MailModule,
    FeedbackModule,
    UsersModule,
    AuthModule,
    OffersModule,
    PapersModule,
    GradingModule,
    DocumentGenerationModule,
    CsvModule,
    StatisticsModule,
    ReportsModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: UserTypesGuard },
    { provide: APP_GUARD, useClass: SudoGuard },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: UserHydrationInterceptor },
  ],
})
export class AppModule {}
