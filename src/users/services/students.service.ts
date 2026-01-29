import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Student, User } from "../entities/user.entity";
import { DataSource, FindOptionsOrder, FindOptionsRelations, FindOptionsWhere, ILike, In, Repository } from "typeorm";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { StudentFilterDto } from "../dto/student-filter.dto";
import { StudentDto } from "../dto/student.dto";
import { UsersService } from "./users.service";
import { SpecializationsService } from "./specializations.service";
import { RequiredDocumentsService } from "src/papers/services/required-documents.service";
import { DocumentsService } from "src/papers/services/documents.service";
import { ImportResult } from "src/lib/interfaces/import-result.interface";
import { CsvParserService } from "src/csv/csv-parser.service";
import { StudentCsvDto } from "../dto/student-csv.dto";
import { UserType } from "src/lib/enums/user-type.enum";
import { indexArray } from "src/lib/utils";

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
  ) {}

  private defaultRelations: FindOptionsRelations<Student> = {
    specialization: {
      domain: true,
    }
  };

  async findAll(dto: StudentFilterDto): Promise<Paginated<Student>> {
    const where: FindOptionsWhere<Student> = {};
    if(dto.domainId) {
      where.specialization = { domain: { id: dto.domainId } };
    }
    if(dto.specializationId) {
      where.specialization = { id: dto.specializationId };
    }
    ['group', 'promotion'].forEach(field => {
      if(dto[field]) {
        where[field] = dto[field];
      }
    });
    ['lastName', 'firstName', 'email'].forEach(field => {
      if(dto[field]) {
        where[field] = ILike(`%${dto[field]}%`);
      }
    });
    let order: FindOptionsOrder<Student> = {};
    if(dto.sortBy === 'domain') {
      order = { specialization: { domain: { name: dto.sortDirection } } };
    } else {
      order[dto.sortBy] = dto.sortDirection;
    }
    const [rows, count] = await this.studentsRepository.findAndCount({
      relations: this.defaultRelations,
      where,
      order,
      take: dto.limit,
      skip: dto.offset,
    });
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

  async create(dto: StudentDto): Promise<Student> {
    await this.usersService.checkEmailExists(dto.email);
    const relations = await this.getRelations(dto);
    const student = this.studentsRepository.create({ ...dto, ...relations });
    return this.studentsRepository.save(student);
  }

  private async _create(student: Student): Promise<Student> {
    return this.dataSource.transaction(async manager => {
      const result = await manager.save(student);
      await this.usersService.sendActivationEmail(result, manager);
      return result;
    });
  }

  async update(id: number, dto: StudentDto): Promise<{ result: Student; documentsGenerated: boolean; }> {
    await this.usersService.checkEmailExists(dto.email, id);
    const student = await this.findOne(id);
    const relations = await this.getRelations(dto);
    const updatedStudent = this.studentsRepository.merge(student, dto, relations);
    return this._update(updatedStudent);
  }

  private async _update(student: Student): Promise<{ result: Student; documentsGenerated: boolean; }> {
    if(student.paper && student.paper.isValid !== null) {
      throw new BadRequestException('Studentul nu poate fi modificat după validarea lucrării acestuia.');
    }
    const result = await this.studentsRepository.save(student);
    let documentsGenerated = false;
    if(result.paper) {
      await this.requiredDocumentsService.updateRequiredDocumentsForPaper(result.paper.id);
      documentsGenerated = (await this.documentsService.generatePaperDocuments(result.paper.id)).length > 0;
    }
    return { result, documentsGenerated };
  }

  async remove(id: number): Promise<void> {
    const student = await this.findOne(id);
    await this.studentsRepository.softRemove(student);
  }

  async import(file: Buffer, specializationId: number): Promise<ImportResult<StudentDto, Student | { result: Student; documentsGenerated: boolean; }>> {
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
          ? await this._update(studentEntity)
          : await this._create(studentEntity);
        if(!existingUser) {
          bulkResult.summary.created++;
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