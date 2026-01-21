import { Controller, Get } from "@nestjs/common";
import { SessionSettingsService } from "./session-settings.service";

@Controller("session")
export class SessionSettingsController {
  constructor(
    private readonly sessionSettingsService: SessionSettingsService,
  ) {}

  @Get()
  async getSettings() {
    return this.sessionSettingsService.getSettings();
  }
}