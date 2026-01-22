import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Student } from "../entities/user.entity";
import { FindOptionsOrder, FindOptionsRelations, FindOptionsWhere, ILike, Repository } from "typeorm";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { StudentFilterDto } from "../dto/student-filter.dto";
import { StudentDto } from "../dto/student.dto";
import { UsersService } from "./users.service";
import { SpecializationsService } from "./specializations.service";

@Injectable()
export class StudentsService {
  
  constructor(
    @InjectRepository(Student) private studentsRepository: Repository<Student>,
    private readonly usersService: UsersService,
    private readonly specializationsService: SpecializationsService,
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
      relations: this.defaultRelations,
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

  async bulkCreate(): Promise<void> {
    // TODO: implement bulk create
  }

  async update(id: number, dto: StudentDto): Promise<Student> {
    await this.usersService.checkEmailExists(dto.email, id);
    const student = await this.findOne(id);
    const relations = await this.getRelations(dto);
    const updatedStudent = this.studentsRepository.merge(student, dto, relations);
    return this.studentsRepository.save(updatedStudent);
  }

  async remove(id: number): Promise<void> {
    const student = await this.findOne(id);
    await this.studentsRepository.softRemove(student);
  }

}