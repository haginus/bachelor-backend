import { Injectable } from '@nestjs/common';
import { console } from 'inspector';
import { Committee } from '../grading/entities/committee.entity';
import { Statistic } from '../lib/interfaces/statistic.interface';
import { Paper } from '../papers/entities/paper.entity';
import { SignUpRequest } from '../users/entities/sign-up-request.entity';
import { User } from '../users/entities/user.entity';
import { DataSource, IsNull, Not } from 'typeorm';

@Injectable()
export class StatisticsService {

  constructor(
    private readonly dataSource: DataSource
  ) {
    this.find().then(console.log).catch(console.error);
  }

  async find() {
    const usersRepo = this.dataSource.getRepository(User);
    const signUpRequestsRepo = this.dataSource.getRepository(SignUpRequest);
    const papersRepo = this.dataSource.getRepository(Paper);
    const committeesRepo = this.dataSource.getRepository(Committee);

    const [
      studentCount,
      validatedStudentCount,
      teacherCount,
      validatedTeacherCount,
      signUpRequestCount,
      paperCount,
      assignedPaperCount,
      committeeCount,
    ] = await Promise.all([
      usersRepo.countBy({ type: 'student' }),
      usersRepo.countBy({ type: 'student', validated: true }),
      usersRepo.countBy({ type: 'teacher' }),
      usersRepo.countBy({ type: 'teacher', validated: true }),
      signUpRequestsRepo.count(),
      papersRepo.countBy({ student: { submission: { isSubmitted: true } } }),
      papersRepo.countBy({ student: { submission: { isSubmitted: true } }, committeeId: Not(IsNull()) }),
      committeesRepo.count(),
    ]);
    return [
      { title: 'Studenți', content: studentCount, extra: `din care ${validatedStudentCount} cu cont activ`, sectionPath: 'students' },
      { title: 'Profesori', content: teacherCount, extra: `din care ${validatedTeacherCount} cu cont activ`, sectionPath: 'teachers' },
      { title: 'Cereri de înregistrare', content: signUpRequestCount, sectionPath: 'sign-up-requests' },
      { title: 'Lucrări', content: paperCount, extra: `din care ${assignedPaperCount} atribuite`, sectionPath: 'papers' },
      { title: 'Comisii', content: committeeCount, sectionPath: 'committees' },
    ] satisfies Statistic[];
  }
}
