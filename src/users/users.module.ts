import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Domain } from './entities/domain.entity';
import { Specialization } from './entities/specialization.entity';
import { Admin, Secretary, Student, Teacher, User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { UsersService } from './services/users.service';
import { StudentsService } from './services/students.service';
import { StudentsController } from './controllers/students.controller';
import { DomainsController } from './controllers/domains.controller';
import { DomainsService } from './services/domains.service';
import { ProfilesService } from './services/profiles.service';
import { UsersController } from './controllers/users.controller';
import { CommonModule } from 'src/common/common.module';
import { SpecializationsService } from './services/specializations.service';
import { TeachersService } from './services/teachers.service';
import { TeachersController } from './controllers/teachers.controller';
import { UserExtraData } from './entities/user-extra-data.entity';
import { Address } from './entities/address.entity';
import { PapersModule } from 'src/papers/papers.module';
import { CsvModule } from 'src/csv/csv.module';
import { MailModule } from 'src/mail/mail.module';
import { ActivationToken } from './entities/activation-token.entity';

@Module({
  imports: [
    CommonModule,
    MailModule,
    CsvModule,
    PapersModule,
    TypeOrmModule.forFeature([
      Domain,
      Specialization,
      ActivationToken,
      Profile,
      User,
      Admin,
      Secretary,
      Student,
      Teacher,
      UserExtraData,
      Address,
    ]),
  ],
  controllers: [
    DomainsController,
    UsersController,
    StudentsController,
    TeachersController,
  ],
  providers: [
    DomainsService,
    SpecializationsService,
    ProfilesService,
    UsersService,
    StudentsService,
    TeachersService,
  ],
  exports: [
    DomainsService,
    SpecializationsService,
    UsersService,
    StudentsService,
    TeachersService,
  ],
})
export class UsersModule {}
