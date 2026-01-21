import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SessionSettings } from "./session-settings.entity";
import { Repository } from "typeorm";
import { stripTime } from "src/lib/utils";

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