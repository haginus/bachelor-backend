import { Body, Controller, Get, Put } from "@nestjs/common";
import { SessionSettingsService } from "../services/session-settings.service";
import { Public } from "src/auth/decorators/public.decorator";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { SessionSettingsDto } from "../dto/session-settings.dto";

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

  @UserTypes(UserType.Admin)
  @Put()
  async updateSettings(@Body() dto: SessionSettingsDto) {
    return this.sessionSettingsService.updateSettings(dto);
  }
}