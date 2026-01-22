import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Domain } from './entities/domain.entity';
import { Specialization } from './entities/specialization.entity';
import { Admin, Secretary, Student, Teacher, User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { UsersService } from './services/users.service';

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
  providers: [
    UsersService,
  ],
  exports: [
    UsersService,
  ],
})
export class UsersModule {}
