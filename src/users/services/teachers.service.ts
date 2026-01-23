import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Teacher } from "../entities/user.entity";
import { FindOptionsRelations, FindOptionsWhere, ILike, Repository } from "typeorm";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { UsersService } from "./users.service";
import { UserDto } from "../dto/user.dto";
import { TeacherFilterDto } from "../dto/teacher-filter.dto";

@Injectable()
export class TeachersService {
  
  constructor(
    @InjectRepository(Teacher) private teachersRepository: Repository<Teacher>,
    private readonly usersService: UsersService,
  ) {}

  private defaultRelations: FindOptionsRelations<Teacher> = {};

  async findAll(dto: TeacherFilterDto): Promise<Paginated<Teacher>> {
    const where: FindOptionsWhere<Teacher> = {};
    ['lastName', 'firstName', 'email'].forEach(field => {
      if(dto[field]) {
        where[field] = ILike(`%${dto[field]}%`);
      }
    });
    const [rows, count] = await this.teachersRepository.findAndCount({
      relations: this.defaultRelations,
      where,
      order: { [dto.sortBy]: dto.sortDirection },
      take: dto.limit,
      skip: dto.offset,
    });
    return { rows, count };
  }

  async findOne(id: number): Promise<Teacher> {
    const teacher = await this.teachersRepository.findOne({
      where: { id },
      relations: this.defaultRelations,
    });
    if(!teacher) {
      throw new NotFoundException();
    }
    return teacher;
  }

  async create(dto: UserDto): Promise<Teacher> {
    await this.usersService.checkEmailExists(dto.email);
    const teacher = this.teachersRepository.create(dto);
    return this.teachersRepository.save(teacher);
  }

  async bulkCreate(): Promise<void> {
    // TODO: implement bulk create
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

}