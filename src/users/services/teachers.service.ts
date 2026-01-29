import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Teacher } from "../entities/user.entity";
import { In, Repository, DataSource } from "typeorm";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { UsersService } from "./users.service";
import { UserDto } from "../dto/user.dto";
import { TeacherFilterDto } from "../dto/teacher-filter.dto";
import { CsvParserService } from "src/csv/csv-parser.service";
import { ImportResult } from "src/lib/interfaces/import-result.interface";
import { DataSource } from "typeorm/browser";

@Injectable()
export class TeachersService {
  
  constructor(
    @InjectRepository(Teacher) private teachersRepository: Repository<Teacher>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    private readonly csvParserService: CsvParserService,
  ) {}

  private getQueryBuilder(detailed = false) {
    const qb = this.teachersRepository.createQueryBuilder('teacher');
    if(detailed) {
      qb.addSelect(['teacher.offerCount', 'teacher.paperCount', 'teacher.submittedPaperCount', 'teacher.plagiarismReportCount']);
    }
    return qb;
  }

  async findAll(dto: TeacherFilterDto): Promise<Paginated<Teacher>> {
    const qb = this.getQueryBuilder(dto.detailed);
    ['lastName', 'firstName', 'email'].forEach(field => {
      if(dto[field]) {
        qb.andWhere(`teacher.${field} LIKE :${field}`, { [field]: `%${dto[field]}%` });
      }
    });
    if(dto.onlyMissingPlagiarismReports) {
      qb.andWhere(`
        (
          SELECT COUNT(paper.id)
          FROM paper
          WHERE paper.teacherId = teacher.id AND paper.submissionId IS NOT NULL AND paper.deletedAt IS NULL
        ) >
        (
          SELECT COUNT(document.id)
          FROM document, paper
          WHERE 
            paper.teacherId = teacher.id AND 
            document.paperId = paper.id AND 
            document.name = 'plagiarism_report' AND
            paper.submissionId IS NOT NULL AND
            paper.deletedAt IS NULL AND
            document.deletedAt IS NULL
        )
      `);
    }
    const count = await qb.getCount();
    qb.take(dto.limit).skip(dto.offset);
    qb.orderBy(`teacher.${dto.sortBy}`, dto.sortDirection.toLocaleUpperCase() as 'ASC' | 'DESC');
    const rows = await qb.getMany();
    return { rows, count };
  }

  async findAllByIds(ids: number[]): Promise<Teacher[]> {
    const teachers = await this.teachersRepository.findBy({ id: In(ids) });
    if(teachers.length !== ids.length) {
      throw new NotFoundException('Unul sau mai mulți profesori nu au fost găsiți.');
    }
    return teachers;
  }

  async findOne(id: number): Promise<Teacher> {
    const qb = this.getQueryBuilder(true)
      .where('teacher.id = :id', { id });
    const teacher = await qb.getOne();
    if(!teacher) {
      throw new NotFoundException();
    }
    return teacher;
  }

  async create(dto: UserDto): Promise<Teacher> {
    await this.usersService.checkEmailExists(dto.email);
    const teacher = this.teachersRepository.create(dto);
    return this.dataSource.transaction(async manager => {
      const result = await manager.save(teacher);
      await this.usersService.sendActivationEmail(result, manager);
      return result;
    });
  }

  async update(id: number, dto: UserDto): Promise<Teacher> {
    await this.usersService.checkEmailExists(dto.email, id);
    const teacher = await this.findOne(id);
    const updatedTeacher = this.teachersRepository.merge(teacher, dto);
    return this.teachersRepository.save(updatedTeacher);
  }

  async remove(id: number): Promise<void> {
    const teacher = await this.findOne(id);
    await this.teachersRepository.softRemove(teacher);
  }

  async import(file: Buffer): Promise<ImportResult<UserDto, Teacher>> {
    const dtos = await this.csvParserService.parse(file, {
      headers: [
        ['TITLU', 'title'],
        ['NUME', 'lastName'],
        ['PRENUME', 'firstName'],
        ['CNP', 'CNP'],
        ['EMAIL', 'email'],
      ],
      dto: UserDto,
    });
    const promises = dtos.map(dto => this.create(dto));
    const results = await Promise.allSettled(promises);
    const bulkResult: ImportResult<UserDto, Teacher> = {
      summary: {
        proccessed: results.length,
        created: 0,
        failed: 0,
      },
      rows: [],
    };
    results.forEach((result, index) => {
      if(result.status === 'fulfilled') {
        bulkResult.summary.created++;
        bulkResult.rows.push({
          rowIndex: index + 1,
          result: 'created',
          row: dtos[index],
          data: result.value,
        });
      } else {
        bulkResult.summary.failed++;
        bulkResult.rows.push({
          rowIndex: index + 1,
          result: 'failed',
          row: dtos[index],
          data: null,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });
    return bulkResult;
  }

}