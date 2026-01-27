import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isStudent, Student, User } from "../entities/user.entity";
import { FindOptionsRelations, Repository } from "typeorm";
import { ValidateUserDto } from "../dto/validate-user.dto";
import { TopicsService } from "src/common/services/topics.service";
import { UserExtraData } from "../entities/user-extra-data.entity";
import { UserExtraDataDto } from "../dto/user-extra-data.dto";
import { DocumentsService } from "src/papers/services/documents.service";

@Injectable()
export class UsersService {
  
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(UserExtraData) private readonly userExtraDataRepository: Repository<UserExtraData>,
    private readonly topicsService: TopicsService,
    private readonly documentsService: DocumentsService,
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

  async findExtraDataByUserId(userId: number): Promise<UserExtraData | null> {
    const extraData = await this.userExtraDataRepository.findOne({ where: { userId } });
    return extraData;
  }

  async updateExtraData(userId: number, dto: UserExtraDataDto): Promise<{ result: UserExtraData; documentsGenerated: boolean; }> {
    const user = await this.findOne(userId);
    if(!isStudent(user)) {
      throw new BadRequestException('Utilizatorul nu este student.');
    }
    if(user.paper?.isValid !== null) {
      throw new BadRequestException('Datele suplimentare nu pot fi modificate după validarea lucrării.');
    }
    const extraData = this.userExtraDataRepository.create({ ...dto, user, userId: user.id });
    await this.userExtraDataRepository.save(extraData);
    const documentsGenerated = user.paper && (await this.documentsService.generatePaperDocuments(user.paper.id)).length > 0;
    return { result: extraData, documentsGenerated };
  }
}