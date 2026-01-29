import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SignUpRequest } from "../entities/sign-up-request.entity";
import { FindOptionsRelations, Repository } from "typeorm";
import { SpecializationsService } from "./specializations.service";
import { SignUpRequestDto } from "../dto/sign-up-request.dto";
import { Student, User } from "../entities/user.entity";
import { MailService } from "src/mail/mail.service";
import { SignUpRequestPartialDto } from "../dto/sign-up-request-partial.dto";
import { StudentsService } from "./students.service";

@Injectable()
export class SignUpRequestsService {
  
  constructor(
    @InjectRepository(SignUpRequest) private readonly signUpRequestsRepository: Repository<SignUpRequest>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly specializationsService: SpecializationsService,
    private readonly studentsService: StudentsService,
    private readonly mailService: MailService,
  ) {}

  private readonly defaultRelations: FindOptionsRelations<SignUpRequest> = {
    specialization: { domain: true },
  };

  async findAll(): Promise<SignUpRequest[]> {
    return this.signUpRequestsRepository.find({
      relations: this.defaultRelations,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<SignUpRequest> {
    const signUpRequest = await this.signUpRequestsRepository.findOne({ 
      where: { id },
      relations: this.defaultRelations,
    });
    if(!signUpRequest) {
      throw new NotFoundException();
    }
    return signUpRequest;
  }

  private async checkEmail(email: string): Promise<void> {
    const entity = (
      (await this.usersRepository.findOneBy({ email })) || 
      (await this.signUpRequestsRepository.findOneBy({ email }))
    );
    if(entity) {
      throw new ConflictException('Acest e-mail este deja înregistrat sau cererea este în curs de procesare.');
    }
  }

  async create(dto: SignUpRequestDto): Promise<SignUpRequest> {
    await this.checkEmail(dto.email);
    const specialization = await this.specializationsService.findOne(dto.specializationId);
    const signUpRequest = this.signUpRequestsRepository.create({
      ...dto,
      specialization,
    });
    const savedRequest = await this.signUpRequestsRepository.save(signUpRequest);
    this.mailService.sendSignUpRequestNoticeEmail(savedRequest);
    return savedRequest;
  }

  async accept(id: number, additionalChanges?: SignUpRequestPartialDto): Promise<Student> {
    const signUpRequest = await this.findOne(id);
    const specializationId = additionalChanges?.specializationId || signUpRequest.specialization?.id;
    if(!specializationId) {
      throw new BadRequestException('Specializarea este obligatorie.');
    }
    const studentDto = {
      ...signUpRequest,
      ...additionalChanges,
      specializationId,
      generalAverage: additionalChanges?.generalAverage ?? null,
      id: undefined,
    }
    const student = await this.studentsService.create(studentDto);
    await this.signUpRequestsRepository.remove(signUpRequest);
    return student;
  }

  async reject(id: number): Promise<void> {
    const signUpRequest = await this.findOne(id);
    await this.signUpRequestsRepository.remove(signUpRequest);
  }

}