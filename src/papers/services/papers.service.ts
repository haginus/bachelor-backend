import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Paper } from "../entities/paper.entity";
import { FindOptionsRelations, Repository } from "typeorm";
import { merge } from "lodash";
import { PaperQueryDto } from "../dto/paper-query.dto";
import { Paginated } from "src/lib/interfaces/paginated.interface";

@Injectable()
export class PapersService {
  
  constructor(
    @InjectRepository(Paper) private readonly papersRepository: Repository<Paper>,
  ) {}

  defaultRelations: FindOptionsRelations<Paper> = {
    student: true,
    teacher: true,
    documents: true,
    topics: true,
  };

  private mergeRelations(relations: FindOptionsRelations<Paper>): FindOptionsRelations<Paper> {
    return merge({}, this.defaultRelations, relations);
  }

  async findOneByStudent(studentId: number): Promise<Paper> {
    const paper = await this.papersRepository.findOne({
      where: { student: { id: studentId } },
      relations: this.defaultRelations,
    });
    if(!paper) {
      throw new NotFoundException();
    }
    return paper;
  }

  async findAllByTeacher(teacherId: number): Promise<Paper[]> {
    return this.papersRepository.find({
      where: { teacher: { id: teacherId } },
      relations: this.mergeRelations({ teacher: false, student: { specialization: true } }),
    });
  }

  async findAll(query: PaperQueryDto): Promise<Paginated<Paper>> {
    const qb = this.papersRepository.createQueryBuilder('paper')
      .leftJoinAndSelect('paper.student', 'student')
      .leftJoinAndSelect('paper.teacher', 'teacher')
      .leftJoinAndSelect('paper.documents', 'documents')
      .leftJoinAndSelect('paper.topics', 'topics');
    
    if(query.validState) {
      if(query.validState === 'not_validated') {
        qb.andWhere('paper.isValid IS NULL');
      } else {
        qb.andWhere('paper.isValid = :isValid', { isValid: query.validState === 'valid' });
      }
    }
    if(query.title) {
      qb.andWhere('paper.title LIKE :title', { title: `%${query.title}%` });
    }
    if(query.type) {
      qb.andWhere('paper.type = :type', { type: query.type });
    }
    if(query.domainId && !query.specializationId) {
      qb
        .leftJoin('student.specialization', 'specialization')
        .leftJoin('specialization.domain', 'domain')
        .andWhere('domain.id = :domainId', { domainId: query.domainId });
    }
    if(query.specializationId) {
      qb
        .leftJoin('student.specialization', 'specialization')
        .andWhere('specialization.id = :specializationId', { specializationId: query.specializationId });
    }
    if(query.studentName) {
      qb.andWhere(
        `(CONCAT(student.firstName, ' ', student.lastName) LIKE :search OR CONCAT(student.lastName, ' ', student.firstName) LIKE :search)`,
        { search: `%${query.studentName}%` },
      );
    }
    const count = await qb.getCount();
    if(query.sortBy) {
      if(query.sortBy === 'committee') {
        // TODO
      } else {
        qb.orderBy(`paper.${query.sortBy}`, query.sortDirection.toUpperCase() as 'ASC' | 'DESC');
      }
    }
    const rows = await qb.skip(query.offset).take(query.limit).getMany();
    return { rows, count };
  }

}