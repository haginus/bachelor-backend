import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Application } from "../entities/application.entity";
import { FindOptionsRelations, FindOptionsWhere, IsNull, Not, Repository, DataSource } from "typeorm";
import { ApplicationQueryDto } from "../dto/application-query.dto";
import { merge } from "lodash";
import { Student, User } from "src/users/entities/user.entity";
import { UserType } from "src/lib/enums/user-type.enum";
import { ApplicationDto } from "../dto/application.dto";
import { SessionSettingsService } from "src/common/services/session-settings.service";
import { OffersService } from "./offers.service";
import { MailService } from "src/mail/mail.service";
import { Paper } from "src/papers/entities/paper.entity";
import { plainToInstance } from "class-transformer";
import { RequiredDocumentsService } from "src/papers/services/required-documents.service";

@Injectable()
export class ApplicationsService {
  
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Application) private readonly applicationsRepository: Repository<Application>,
    private readonly sessionSettingsService: SessionSettingsService,
    private readonly offersService: OffersService,
    private readonly requiredDocumentsService: RequiredDocumentsService,
    private readonly mailService: MailService,
  ) {}

  defaultRelations: FindOptionsRelations<Application> = {
    offer: {
      topics: true,
      domain: true,
    }
  };

  private mergeRelations(relations: FindOptionsRelations<Application>): FindOptionsRelations<Application> {
    return merge({}, this.defaultRelations, relations);
  }

  getWhereClause(query: ApplicationQueryDto) {
    const where: FindOptionsWhere<Application> = {};
    if(query.state) {
      where.accepted = query.state === 'pending' ? IsNull() : query.state === 'accepted' ? true : false;
    }
    if(query.offerId) {
      where.offerId = query.offerId;
    }
    return where;
  }

  findAllByStudent(studentId: number, query: ApplicationQueryDto): Promise<Application[]> {
    return this.applicationsRepository.find({
      where: { 
        ...this.getWhereClause(query),
        student: { id: studentId }
      },
      relations: this.mergeRelations({ 
        offer: { teacher: true } 
      }),
    });
  }

  findAllByTeacher(teacherId: number, query: ApplicationQueryDto): Promise<Application[]> {
    return this.applicationsRepository.find({
      where: { 
        ...this.getWhereClause(query),
        offer: { teacher: { id: teacherId } }
      },
      relations: this.mergeRelations({
        student: true,
      }),
    });
  }

  async findOne(id: number, user?: User): Promise<Application> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
      relations: this.mergeRelations({
        student: true,
        offer: { teacher: true },
      }),
    });
    if(!application) {
      throw new NotFoundException();
    }
    if(
      user && (
        (user.type === UserType.Student && application.student.id !== user.id) ||
        (user.type === UserType.Teacher && application.offer.teacher.id !== user.id) ||
        user.type === UserType.Secretary
      )
    ) {
      throw new ForbiddenException();
    }
    return application;
  }

  async create(dto: ApplicationDto, student: Student): Promise<Application> {
    if(!await this.sessionSettingsService.canApply()) {
      throw new BadRequestException('Nu puteți trimite cereri în afara perioadei de aplicare.');
    }
    const offer = await this.offersService.findOne(dto.offerId);
    // TODO: check if student has paper
    if(offer.domain.id !== student.specialization.domain.id) {
      throw new BadRequestException('Oferta nu vă este adresată.');
    }
    if(offer.availableSeats <= 0) {
      throw new BadRequestException('Limita de locuri ofertei a fost deja atinsă.');
    }
    const existingApplication = await this.applicationsRepository.findOne({
      where: {
        offer: { id: dto.offerId },
        student: { id: student.id },
      },
    });
    if(existingApplication) {
      throw new BadRequestException('Ați aplicat deja la această ofertă.');
    }
    const application = this.applicationsRepository.create({
      ...dto,
      offer,
      student,
    });
    const savedApplication = await this.applicationsRepository.save(application);
    await this.mailService.sendNewApplicationEmail(student, savedApplication.offer.teacher, savedApplication);
    return savedApplication;
  }

  private async findApplicationForTeacher(id: number, user: User): Promise<Application> {
    const application = await this.findOne(id);
    if(application.accepted !== null) {
      throw new BadRequestException('Cererea a primit deja un răspuns.');
    }
    if(application.offer.teacher.id !== user.id) {
      throw new ForbiddenException();
    }
    return application;
  }

  async accept(id: number, user: User): Promise<Application> {
    const application = await this.findApplicationForTeacher(id, user);
    if(application.offer.availableSeats <= 0) {
      throw new BadRequestException('Limita ofertei a fost deja atinsă. Creșteți limita și reîncercați.');
    }
    application.accepted = true;
    const paper = this.dataSource.getRepository(Paper).create({
      title: application.title,
      description: application.description,
      type: application.offer.domain.paperType,
      studentId: application.student.id,
      teacherId: application.offer.teacher.id,
      topics: application.offer.topics,
      student: application.student,
      teacher: application.offer.teacher,
      requiredDocuments: [],
    });
    paper.requiredDocuments = await this.requiredDocumentsService.getRequiredDocumentsForPaper(paper);
    await this.dataSource.transaction(async manager => {
      await manager.save(application);
      // Remove other applications of the student
      await manager.delete(Application, {
        id: Not(application.id),
        student: { id: application.student.id },
      });
      await manager.save(paper);
      await this.mailService.sendAcceptedApplicationEmail(application.student, application.offer.teacher, application);
    });
    return application;
  }

  async decline(id: number, user: User): Promise<Application> {
    const application = await this.findApplicationForTeacher(id, user);
    application.accepted = false;
    const savedApplication = await this.applicationsRepository.save(application);
    await this.mailService.sendRejectedApplicationEmail(savedApplication.student, savedApplication.offer.teacher, savedApplication);
    return savedApplication;
  }

  async withdraw(id: number, user: User): Promise<void> {
    const application = await this.findOne(id);
    if(application.accepted !== null) {
      throw new BadRequestException('Cererea a primit deja un răspuns.');
    }
    if(application.student.id !== user.id) {
      throw new ForbiddenException();
    }
    await this.applicationsRepository.delete(id);
  }

}