import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseBoolPipe, ParseIntPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { UserType } from "../../lib/enums/user-type.enum";
import { DomainsService } from "../services/domains.service";
import { DomainDto } from "../dto/domain.dto";
import { Public } from "../../auth/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../auth/guards/optional-jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../entities/user.entity";

@Controller('domains')
export class DomainsController {

  constructor(private readonly domainsService: DomainsService) {}
  
  @Get()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query('detailed', new ParseBoolPipe({ optional: true })) detailed: boolean = false,
    @CurrentUser() user?: User,
  ) {
    if(detailed && (!user || (user.type !== UserType.Admin && user.type !== UserType.Secretary))) {
      throw new ForbiddenException();
    }
    return this.domainsService.findAll(detailed);
  }

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Post()
  create(@Body() dto: DomainDto) {
    return this.domainsService.create(dto);
  }

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: DomainDto) {
    return this.domainsService.update(id, dto);
  }

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.domainsService.delete(id);
  }
}