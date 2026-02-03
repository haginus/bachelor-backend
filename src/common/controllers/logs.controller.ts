import { Controller, Get } from "@nestjs/common";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { LogsService } from "../services/logs.service";

@Controller('logs')
@UserTypes([UserType.Admin])
export class LogsController {

  constructor(private readonly logsService: LogsService) {}

  @Get()
  async findAll() {
    return this.logsService.findAll();
  }

}