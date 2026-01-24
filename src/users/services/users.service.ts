import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isStudent, Student, User } from "../entities/user.entity";
import { FindOptionsRelations, Repository } from "typeorm";
import { ValidateUserDto } from "../dto/validate-user.dto";
import { TopicsService } from "src/common/services/topics.service";

@Injectable()
export class UsersService {
  
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly topicsService: TopicsService,
  ) {}

  private defaultRelations: FindOptionsRelations<User & Student> = {
    profile: true,
    specialization: { domain: true },
    paper: true,
  };

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ 
      where: { id },
      relations: this.defaultRelations,
    });
    if(!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async findOneByEmailNullable(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ 
      where: { email },
      relations: this.defaultRelations
    });
    return user;
  }

  async checkEmailExists(email: string, userId?: number): Promise<void> {
    const user = await this.findOneByEmailNullable(email);
    if(user && user.id !== userId) {
      throw new BadRequestException('Emailul există deja.');
    }
  }

  async validate(id: number, dto: ValidateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if(user.validated) {
      return user;
    }
    user.validated = true;
    if(isStudent(user)) {
      user.topics = await this.topicsService.findByIds(dto.topicIds || []);
      if(user.topics.length === 0) {
        throw new BadRequestException('Precizați cel puțin o temă.');
      }
    }
    return this.usersRepository.save(user);
  }
}