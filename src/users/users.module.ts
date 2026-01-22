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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Domain,
      Specialization,
      Profile,
      User,
      Admin,
      Secretary,
      Student,
      Teacher,
    ]),
  ],
  controllers: [
    DomainsController,
    UsersController,
    StudentsController,
  ],
  providers: [
    DomainsService,
    ProfilesService,
    UsersService,
    StudentsService,
  ],
  exports: [
    DomainsService,
    UsersService,
    StudentsService,
  ],
})
export class UsersModule {}
