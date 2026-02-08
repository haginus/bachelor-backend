import { Injectable } from "@nestjs/common";
import { Student, Teacher } from "../../users/entities/user.entity";
import { DataSource } from "typeorm";
import { TeacherOffersQueryDto } from "../dto/teacher-offers-query.dto";
import { plainToInstance } from "class-transformer";
import { TeacherOfferDto } from "../dto/teacher-offer.dto";
import { Application } from "../entities/application.entity";

@Injectable()
export class TeacherOffersService {

  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async findTeacherOffers(student: Student, query: TeacherOffersQueryDto): Promise<TeacherOfferDto[]> {
    let qb = this.dataSource.createQueryBuilder(Teacher, 'teacher')
      .leftJoinAndSelect('teacher.offers', 'offer')
      .leftJoinAndSelect('offer.topics', 'topics')
      .leftJoinAndSelect('teacher.profile', 'profile')
      .where('offer.domainId = :domainId', { domainId: student.specialization.domain.id });
    
    if(query?.isSuggested) {
      const topicIds = await this.dataSource.createQueryBuilder()
        .select('st.topicId', 'topicId')
        .from('student_topics', 'st')
        .where('st.userId = :studentId', { studentId: student.id })
        .getRawMany<{ topicId: number }>();
      
      query.topicIds = topicIds.map(t => t.topicId);
    }
    if(query.onlyActive) {
      qb = qb.andWhere('offer.takenSeats < offer.limit');
    }
    if(query.topicIds?.length) {
      qb = qb
        .leftJoin('offer.topics', 'topic')
        .andWhere('topic.id IN (:...topicIds)', { topicIds: query.topicIds });
    }
    if(query.search) {
      qb.andWhere(
        `(
          CONCAT(teacher.firstName, ' ', teacher.lastName) LIKE :search
          OR
          CONCAT(teacher.lastName, ' ', teacher.firstName) LIKE :search
        )`,
        { search: `%${query.search}%` },
      );
    }
    const teacherOffers = plainToInstance(TeacherOfferDto, await qb.getMany(), { excludeExtraneousValues: true });
    const studentApplications = await this.dataSource.createQueryBuilder(Application, 'application')
      .select('application.offerId', 'offerId')
      .where('application.studentId = :studentId', { studentId: student.id })
      .getRawMany<{ offerId: number }>();
    const studentApplicationsSet = new Set(studentApplications.map(a => a.offerId));
    teacherOffers.flatMap(t => t.offers).forEach(offer => {
      offer.hasApplied = studentApplicationsSet.has(offer.id);
    });
    return teacherOffers;

  }
}