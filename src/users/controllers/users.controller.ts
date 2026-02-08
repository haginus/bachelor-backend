import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ProfileDto } from "../dto/profile.dto";
import { ProfilesService } from "../services/profiles.service";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "../entities/user.entity";
import { UsersService } from "../services/users.service";
import { ValidateUserDto } from "../dto/validate-user.dto";
import { UserExtraDataDto } from "../dto/user-extra-data.dto";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";

@Controller('users')
export class UsersController {

  constructor(
    private readonly usersService: UsersService,
    private readonly profilesService: ProfilesService,
  ) {}

  @UseInterceptors(FileInterceptor('picture'))
  @Patch('me/profile')
  async patchProfile(
    @Body() dto: ProfileDto,
    @UploadedFile() picture: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    dto.picture = picture?.buffer;
    return this.profilesService.patch(user.id, dto);
  }

  @Post('me/validate')
  async validateUser(
    @CurrentUser() user: User,
    @Body() dto: ValidateUserDto,
  ) {
    return this.usersService.validate(user.id, dto);
  }

  @UserTypes(UserType.Student)
  @Get('me/extra-data')
  async findMyExtraData(
    @CurrentUser() user: User,
  ) {
    return this.usersService.findExtraDataByUserId(user.id);
  }

  @UserTypes([UserType.Student, UserType.Admin, UserType.Secretary])
  @Get(':id/extra-data')
  async findExtraData(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if(user.type === UserType.Student && user.id !== id) {
      throw new ForbiddenException();
    }
    return this.usersService.findExtraDataByUserId(id);
  }

  @UserTypes(UserType.Student)
  @Put('me/extra-data')
  async updateMyExtraData(
    @CurrentUser() user: User,
    @Body() dto: UserExtraDataDto,
  ) {
    return this.usersService.updateExtraData(user.id, dto);
  }

  @UserTypes([UserType.Student, UserType.Admin, UserType.Secretary])
  @Put(':id/extra-data')
  async updateExtraData(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UserExtraDataDto,
  ) {
    if(user.type === UserType.Student && user.id !== id) {
      throw new ForbiddenException();
    }
    return this.usersService.updateExtraData(id, dto);
  }

  @Get('check-email')
  async checkEmail(
    @Query('email') email: string,
  ) {
    const user = await this.usersService.findOneByEmailNullable(email);
    return { existingId: user?.id || null };
  }

  @UserTypes([UserType.Admin, UserType.Secretary])
  @Post(':id/resend-activation-email')
  async resendActivationEmail(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.usersService.findOne(id);
    return this.usersService.sendActivationEmail(user);
  }

}