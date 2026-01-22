import { Controller, Get } from "@nestjs/common";
import { SessionSettingsService } from "./session-settings.service";
import { Public } from "src/auth/decorators/public.decorator";

@Controller("session")
export class SessionSettingsController {
  constructor(
    private readonly sessionSettingsService: SessionSettingsService,
  ) {}

  @Public()
  @Get()
  async getSettings() {
    return this.sessionSettingsService.getSettings();
  }
}