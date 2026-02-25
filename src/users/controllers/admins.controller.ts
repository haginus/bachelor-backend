import { Body, Controller, Delete, Get, Param, Post, Put, Query, SerializeOptions } from "@nestjs/common";
import { UserType } from "../../lib/enums/user-type.enum";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../entities/user.entity";
import { AdminsService } from "../services/admins.service";
import { AdminDto } from "../dto/admin.dto";
import { AdminQueryDto } from "../dto/admin-query.dto";

@Controller('admins')
@UserTypes([UserType.Admin])
@SerializeOptions({ groups: ['full'] })
export class AdminsController {

  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  async findAll(@Query() query: AdminQueryDto) {
    return this.adminsService.findAll(query);
  }

  @Post()
  async create(@Body() dto: AdminDto, @CurrentUser() user: User) {
    return this.adminsService.create(dto, user);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: AdminDto, @CurrentUser() user: User) {
    return this.adminsService.update(id, dto, user);
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @CurrentUser() user: User) {
    return this.adminsService.remove(id, user);
  }
}