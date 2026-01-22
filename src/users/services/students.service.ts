import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Student } from "../entities/user.entity";
import { Repository } from "typeorm";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { StudentFilterDto } from "../dto/student-filter.dto";

@Injectable()
export class StudentsService {
  
  constructor(
    @InjectRepository(Student) private studentsRepository: Repository<Student>,
  ) {}

  async findAll(dto: StudentFilterDto): Promise<Paginated<Student>> {
    const [rows, count] = await this.studentsRepository.findAndCount({
      relations: {
        specialization: {
          domain: true,
        }
      },
      where: dto.specializationId ? { specialization: { id: dto.specializationId } } : {},
      take: dto.limit,
      skip: dto.offset,
    });
    return { rows, count };
  }

}