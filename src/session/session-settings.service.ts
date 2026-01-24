import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SessionSettings } from "./session-settings.entity";
import { Repository } from "typeorm";
import { stripTime } from "src/lib/utils";
import { SessionSettingsDto } from "./session-settings.dto";

@Injectable()
export class SessionSettingsService {

  private settingsCache: SessionSettings | null = null;

  constructor(
    @InjectRepository(SessionSettings) private readonly sessionSettingsRepository: Repository<SessionSettings>,
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

  private async getSettingsFromDb(): Promise<SessionSettings | null> {
    return this.sessionSettingsRepository.findOneBy({ id: 1 });
  }

  private async createDefaultSettings(): Promise<SessionSettings> {
    const currentDate = stripTime(new Date());
    const defaultSettings = this.sessionSettingsRepository.create({
      id: 1,
      sessionName: "Sesiune nouă",
      currentPromotion: currentDate.getFullYear().toString(),
      applyStartDate: currentDate,
      applyEndDate: currentDate,
      fileSubmissionStartDate: currentDate,
      fileSubmissionEndDate: currentDate,
      paperSubmissionEndDate: currentDate,
    });
    return this.sessionSettingsRepository.save(defaultSettings);
  } 
}