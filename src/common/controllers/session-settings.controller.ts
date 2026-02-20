import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { SessionSettingsService } from "../services/session-settings.service";
import { Public } from "../../auth/decorators/public.decorator";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { UserType } from "../../lib/enums/user-type.enum";
import { SessionSettingsDto } from "../dto/session-settings.dto";
import { Sudo } from "../../auth/decorators/sudo.decorator";

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
  @Sudo()
  @Patch()
  async updateSettings(@Body() dto: SessionSettingsDto) {
    return this.sessionSettingsService.updateSettings(dto);
  }

  @UserTypes(UserType.Admin)
  @Sudo()
  @Post("new")
  async beginNewSession() {
    return this.sessionSettingsService.beginNewSession();
  }
}