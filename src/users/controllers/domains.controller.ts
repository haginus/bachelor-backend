import { Body, Controller, Delete, Get, Param, ParseBoolPipe, ParseIntPipe, Post, Put, Query } from "@nestjs/common";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { DomainsService } from "../services/domains.service";
import { DomainDto } from "../dto/domain.dto";

@Controller('domains')
@UserTypes([UserType.Admin, UserType.Secretary])
export class DomainsController {

  constructor(private readonly domainsService: DomainsService) {}
  
  @Get()
  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Teacher])
  findAll(@Query('detailed', ParseBoolPipe) detailed: boolean) {
    return this.domainsService.findAll(detailed);
  }

  @Post()
  create(@Body() dto: DomainDto) {
    return this.domainsService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: DomainDto) {
    return this.domainsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.domainsService.delete(id);
  }
}