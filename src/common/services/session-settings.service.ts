import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SessionSettings } from "../entities/session-settings.entity";
import { DataSource, Repository } from "typeorm";
import { getDocumentStoragePath, stripTime } from "src/lib/utils";
import { SessionSettingsDto } from "../dto/session-settings.dto";
import { Log } from "../entities/log.entity";
import { DocumentReuploadRequest } from "src/papers/entities/document-reupload-request.entity";
import { Committee } from "src/grading/entities/committee.entity";
import { Application } from "src/offers/entities/application.entity";
import { Offer } from "src/offers/entities/offer.entity";
import { Document } from "src/papers/entities/document.entity";
import { Student } from "src/users/entities/user.entity";
import { PaperGrade } from "src/grading/entities/paper-grade.entity";
import { UserExtraData } from "src/users/entities/user-extra-data.entity";
import { Paper } from "src/papers/entities/paper.entity";
import { Submission } from "src/papers/entities/submission.entity";
import { rm } from "fs/promises";

@Injectable()
export class SessionSettingsService {

  private settingsCache: SessionSettings | null = null;

  constructor(
    @InjectRepository(SessionSettings) private readonly sessionSettingsRepository: Repository<SessionSettings>,
    private readonly dataSource: DataSource,
  ) {}

  async getSettings(): Promise<SessionSettings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }
    const settings = await this.getSettingsFromDb() ?? await this.createDefaultSettings();
    this.settingsCache = settings;
    return settings;
  }

  async canApply(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.canApply();
  }

  async canUploadSecretaryFiles(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.canUploadSecretaryFiles();
  }

  async canUploadPaperFiles(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.canUploadPaperFiles();
  }

  async updateSettings(dto: SessionSettingsDto) {
    if(dto.applyEndDate < dto.applyStartDate) {
      throw new BadRequestException('Data încheierii sesiunii de cereri nu poate fi mai devreme de cea a începerii!');
    }
    if(dto.fileSubmissionStartDate < dto.applyStartDate) {
      throw new BadRequestException('Data începerii depunerilor de documente nu poate fi mai devreme de cea a începerii sesiunii de cereri!');
    }
    if(dto.fileSubmissionEndDate < dto.fileSubmissionStartDate) {
      throw new BadRequestException('Data încheierii depunerilor de documente nu poate fi mai devreme de cea a începerii depunerilor!');
    }
    if(dto.paperSubmissionEndDate < dto.fileSubmissionStartDate) {
      throw new BadRequestException('Data încheierii depunerilor lucrărilor nu poate fi mai devreme de cea a începerii depunerilor!');
    }
    const currentSettings = await this.getSettings();
    const updatedSettings = this.sessionSettingsRepository.merge(currentSettings, dto);
    const savedSettings = await this.sessionSettingsRepository.save(updatedSettings);
    this.settingsCache = savedSettings;
    return savedSettings;
  }

  async beginNewSession() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.deleteAll(Log);
      const students = await queryRunner.manager.createQueryBuilder(Student, "student")
        .innerJoinAndSelect("student.paper", "paper")
        .leftJoinAndSelect("paper.grades", "grades")
        .getMany();
      for(const student of students) {
        if(student.paper.gradeAverage! >= 6) {
          await queryRunner.manager.remove(student);
          await queryRunner.manager.remove(student.paper);
        }
      }
      await queryRunner.manager.updateAll(Paper, { isValid: null, submission: null });
      await queryRunner.manager.deleteAll(Submission);
      await queryRunner.manager.deleteAll(UserExtraData);
      await queryRunner.manager.deleteAll(Application);
      await queryRunner.manager.deleteAll(Offer);
      await queryRunner.manager.deleteAll(Document);
      await queryRunner.manager.deleteAll(DocumentReuploadRequest);
      await queryRunner.manager.deleteAll(PaperGrade);
      await queryRunner.manager.deleteAll(Committee);
      const sessionSettings = await queryRunner.manager.save(this.getDefaultSettings());
      await rm(getDocumentStoragePath(''), { recursive: true, force: true });
      await queryRunner.commitTransaction();
      return sessionSettings;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async getSettingsFromDb(): Promise<SessionSettings | null> {
    return this.sessionSettingsRepository.findOneBy({ id: 1 });
  }

  private getDefaultSettings(): SessionSettings {
    const currentDate = stripTime(new Date());
    return this.sessionSettingsRepository.create({
      id: 1,
      sessionName: "Sesiune nouă",
      currentPromotion: currentDate.getFullYear().toString(),
      applyStartDate: currentDate,
      applyEndDate: currentDate,
      fileSubmissionStartDate: currentDate,
      fileSubmissionEndDate: currentDate,
      paperSubmissionEndDate: currentDate,
      allowGrading: false,
    });
  }

  private async createDefaultSettings(): Promise<SessionSettings> {
    const defaultSettings = this.getDefaultSettings();
    return this.sessionSettingsRepository.save(defaultSettings);
  } 
}