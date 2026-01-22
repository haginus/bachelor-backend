import { Controller, Get } from "@nestjs/common";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { DomainsService } from "../services/domains.service";

@Controller('domains')
@UserTypes([UserType.Admin, UserType.Secretary])
export class DomainsController {

  constructor(private readonly domainsService: DomainsService) {}
  
  @Get()
  findAll() {
    return this.domainsService.findAll();
  }
}