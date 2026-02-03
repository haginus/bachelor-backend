import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isStudent, Student, User } from "../entities/user.entity";
import { EntityManager, FindOptionsRelations, Repository, DataSource, In } from "typeorm";
import { ValidateUserDto } from "../dto/validate-user.dto";
import { TopicsService } from "src/common/services/topics.service";
import { UserExtraData } from "../entities/user-extra-data.entity";
import { UserExtraDataDto } from "../dto/user-extra-data.dto";
import { DocumentsService } from "src/papers/services/documents.service";
import { RequiredDocumentsService } from "src/papers/services/required-documents.service";
import { ActivationToken } from "../entities/activation-token.entity";
import { randomBytes } from "crypto";
import { MailService } from "src/mail/mail.service";
import { SessionSettingsService } from "src/common/services/session-settings.service";
import { DocumentReuploadRequest } from "src/papers/entities/document-reupload-request.entity";
import { LoggerService } from "src/common/services/logger.service";
import { LogName } from "src/lib/enums/log-name.enum";
import { deepDiff } from "src/lib/utils";
import { instanceToPlain } from "class-transformer";

@Injectable()
export class UsersService {
  
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(UserExtraData) private readonly userExtraDataRepository: Repository<UserExtraData>,
    private readonly topicsService: TopicsService,
    private readonly documentsService: DocumentsService,
    private readonly requiredDocumentsService: RequiredDocumentsService,
    private readonly sessionSettingsService: SessionSettingsService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly loggerService: LoggerService,
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
      throw new BadRequestException('Email-ul există deja.');
    }
  }

  async sendActivationEmail(user: User, manager?: EntityManager): Promise<void> {
    manager = manager || this.dataSource.manager;
    const activationTokenRepository = manager.getRepository(ActivationToken);
    const activationToken = activationTokenRepository.create({
      token: randomBytes(64).toString('hex'),
      user,
    });
    await activationTokenRepository.save(activationToken);
    await this.mailService.sendWelcomeEmail(user, activationToken.token).catch(err => {
      throw new InternalServerErrorException('Eroare la trimiterea email-ului de activare.');
    });
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
    return this.dataSource.transaction(async manager => {
      await this.loggerService.log({ name: LogName.UserValidated, userId: user.id }, { user, manager });
      return this.usersRepository.save(user);
    });
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
    if(!await this.sessionSettingsService.canUploadSecretaryFiles()) {
      if(user.paper) {
        // As a last resort, check if there are reupload requests for the sign_up_form and liquidation_form documents
        const requests = await this.dataSource.getRepository(DocumentReuploadRequest).find({
          where: { paperId: user.paper.id, documentName: In(['sign_up_form', 'liquidation_form']) },
        });
        const documentNamesWithActiveRequests = new Set(requests.filter(r => r.isActive()).map(r => r.documentName));
        if(!documentNamesWithActiveRequests.has('sign_up_form') && !documentNamesWithActiveRequests.has('liquidation_form')) {
          throw new BadRequestException('Nu se pot modifica datele suplimentare în această perioadă.');
        }
      } else {
        throw new BadRequestException('Nu se pot modifica datele suplimentare în această perioadă.');
      }
    }
    const existingExtraData = await this.findExtraDataByUserId(userId);
    const extraData = this.userExtraDataRepository.create({ ...dto, user, userId: user.id });
    await this.dataSource.transaction(async manager => {
      await this.userExtraDataRepository.save(extraData);
      await this.loggerService.log(
        { 
          name: existingExtraData ? LogName.UserExtraDataUpdated : LogName.UserExtraDataCreated,
          userId: user.id, 
          meta: { 
            payload: dto,
            changedFields: existingExtraData ? deepDiff(instanceToPlain(existingExtraData), instanceToPlain(extraData)) : null,
          }
        },
        { user, manager }
      );
    });
    let documentsGenerated = false;
    if(user.paper) {
      await this.requiredDocumentsService.updateRequiredDocumentsForPaper(user.paper.id);
      documentsGenerated = (await this.documentsService.generatePaperDocuments(user.paper.id)).length > 0;
    }
    return { result: extraData, documentsGenerated };
  }
}