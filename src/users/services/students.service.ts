import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Student, User } from "../entities/user.entity";
import { DataSource, FindOptionsRelations, In, Repository } from "typeorm";
import { Paginated } from "../../lib/interfaces/paginated.interface";
import { StudentFilterDto } from "../dto/student-filter.dto";
import { StudentDto } from "../dto/student.dto";
import { UsersService } from "./users.service";
import { SpecializationsService } from "./specializations.service";
import { RequiredDocumentsService } from "../../papers/services/required-documents.service";
import { DocumentsService } from "../../papers/services/documents.service";
import { ImportResult } from "../../lib/interfaces/import-result.interface";
import { CsvParserService } from "../../csv/csv-parser.service";
import { StudentCsvDto } from "../dto/student-csv.dto";
import { UserType } from "../../lib/enums/user-type.enum";
import { indexArray } from "../../lib/utils";
import { LoggerService } from "../../common/services/logger.service";
import { LogName } from "../../lib/enums/log-name.enum";

@Injectable()
export class StudentsService {
  
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Student) private studentsRepository: Repository<Student>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    private readonly specializationsService: SpecializationsService,
    private readonly documentsService: DocumentsService,
    private readonly requiredDocumentsService: RequiredDocumentsService,
    private readonly csvParserService: CsvParserService,
    private readonly loggerService: LoggerService,
  ) {}

  private defaultRelations: FindOptionsRelations<Student> = {
    specialization: {
      domain: true,
    }
  };

  async findAll(dto: StudentFilterDto): Promise<Paginated<Student>> {
    const qb = this.studentsRepository.createQueryBuilder('student')
      .addSelect('student.hasPaper')
      .leftJoinAndSelect('student.specialization', 'specialization')
      .leftJoinAndSelect('specialization.domain', 'domain');
    if(dto.domainId) {
      qb.andWhere('specialization.domainId = :domainId', { domainId: dto.domainId } );
    }
    if(dto.specializationId) {
      qb.andWhere('student.specializationId = :specializationId', { specializationId: dto.specializationId } );
    }
    ['group', 'promotion'].forEach(field => {
      if(dto[field]) {
        qb.andWhere(`student.${field} = :${field}`, { [field]: dto[field] });
      }
    });
    ['lastName', 'firstName', 'email'].forEach(field => {
      if(dto[field]) {
        qb.andWhere(`student.${field} LIKE :${field}`, { [field]: `%${dto[field]}%` });
      }
    });
    const count = await qb.getCount();
    if(dto.sortBy === 'domain') {
      qb.orderBy('domain.name', dto.sortDirection.toUpperCase() as 'ASC' | 'DESC');
    } else {
      qb.orderBy(`student.${dto.sortBy}`, dto.sortDirection.toUpperCase() as 'ASC' | 'DESC');
    }
    qb.take(dto.limit).skip(dto.offset);
    const rows = await qb.getMany();
    return { rows, count };
  }

  async findOne(id: number): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: { ...this.defaultRelations, paper: true },
    });
    if(!student) {
      throw new NotFoundException();
    }
    return student;
  }

  private async getRelations(dto: StudentDto) {
    return {
      specialization: await this.specializationsService.findOne(dto.specializationId),
    }
  }

  async create(dto: StudentDto, requestUser?: User): Promise<Student> {
    const existingUser = await this.usersService.findOneByEmailNullable(dto.email);
    if(existingUser && !dto.merge) {
      throw new BadRequestException('Adresa de e-mail este deja utilizată.');
    }
    const relations = await this.getRelations(dto);
    const student = this.studentsRepository.create({ ...dto, ...relations });
    return this._create(student, dto.merge, requestUser);
  }

  private async _create(student: Student, isMerge: boolean = false, requestUser?: User): Promise<Student> {
    return this.dataSource.transaction(async manager => {
      const result = await manager.save(student);
      await this.loggerService.log({ name: LogName.UserCreated, userId: result.id, meta: { payload: student } }, { user: requestUser, manager });
      if(!isMerge) {
        await this.usersService.sendActivationEmail(result, manager);
      }
      return result;
    });
  }

  async update(id: number, dto: StudentDto, requestUser?: User): Promise<{ result: Student; documentsGenerated: boolean; }> {
    const existingUser = await this.usersService.findOneByEmailNullable(dto.email);
    if(existingUser && existingUser.id !== id && !dto.merge) {
      throw new BadRequestException('Adresa de e-mail este deja utilizată.');
    }
    const student = await this.findOne(id);
    const relations = await this.getRelations(dto);
    const updatedStudent = this.studentsRepository.merge(student, dto, relations);
    return this._update(updatedStudent, requestUser);
  }

  private async _update(student: Student, requestUser?: User): Promise<{ result: Student; documentsGenerated: boolean; }> {
    if(student.paper && student.paper.isValid !== null) {
      throw new BadRequestException('Studentul nu poate fi modificat după validarea lucrării acestuia.');
    }
    const result = await this.studentsRepository.save(student);
    await this.loggerService.log({ name: LogName.UserUpdated, userId: result.id, meta: { payload: student } }, { user: requestUser });
    let documentsGenerated = false;
    if(result.paper) {
      await this.requiredDocumentsService.updateRequiredDocumentsForPaper(result.paper.id);
      documentsGenerated = (await this.documentsService.generatePaperDocuments(result.paper.id)).length > 0;
    }
    return { result, documentsGenerated };
  }

  async remove(id: number, requestUser?: User): Promise<void> {
    const student = await this.findOne(id);
    await this.dataSource.transaction(async manager => {
      await manager.softRemove(student);
      await this.loggerService.log({ name: LogName.UserDeleted, userId: student.id }, { user: requestUser, manager });
    });
  }

  async import(file: Buffer, specializationId: number, requestUser?: User): Promise<ImportResult<StudentDto, Student | { result: Student; documentsGenerated: boolean; }>> {
    const specialization = await this.specializationsService.findOne(specializationId);
    const parsedDtos = await this.csvParserService.parse(file, {
      headers: [
        ['NUME', 'lastName'],
        ['PRENUME', 'firstName'],
        ['CNP', 'CNP'],
        ['EMAIL', 'email'],
        ['GRUPA', 'group'],
        ['NUMAR_MATRICOL', 'identificationCode'],
        ['PROMOTIE', 'promotion'],
        ['FORMA_FINANTARE', 'fundingForm'],
        ['AN_INMATRICULARE', 'matriculationYear']
      ],
      dto: StudentCsvDto,
    });
    const dtos: StudentDto[] = parsedDtos.map(dto => ({ ...dto, specializationId }));
    const existingUsers = await (this.usersRepository as Repository<User & Student>).find({
      relations: { 
        profile: false, 
        paper: true
      },
      where: {
        email: In(dtos.map(d => d.email))
      },
    });
    const existingUsersByEmail = indexArray(existingUsers, user => user.email);
    const bulkResult: ImportResult<StudentDto, Student | { result: Student; documentsGenerated: boolean; }> = {
      summary: {
        proccessed: dtos.length,
        created: 0,
        updated: 0,
        failed: 0,
      },
      rows: [],
    };
    for(let index = 0; index < dtos.length; index++) {
      const dto = dtos[index];
      const existingUser = existingUsersByEmail[dto.email];
      const studentDto = { ...dto, specializationId };
      try {
        if(existingUser && existingUser.type !== UserType.Student) {
          throw new BadRequestException(`Adresa de e-mail este deja utilizată, dar nu de un student.`);
        }
        const studentEntity = this.studentsRepository.create({ ...existingUser, ...studentDto, specialization });
        const data = existingUser
          ? await this._update(studentEntity, requestUser)
          : await this._create(studentEntity, false, requestUser);
        if(!existingUser) {
          bulkResult.summary.created!++;
        } else {
          bulkResult.summary.updated!++;
        }
        bulkResult.rows.push({
          rowIndex: index + 1,
          result: existingUser ? 'updated' : 'created',
          row: dto,
          data,
        });
      } catch (error) {
        bulkResult.summary.failed++;
        bulkResult.rows.push({
          rowIndex: index + 1,
          result: 'failed',
          row: dto,
          data: null,
          error: error?.message || 'Unknown error',
        });
      }
    }
    return bulkResult;
  }

}