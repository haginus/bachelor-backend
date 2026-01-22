import { Body, Controller, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ProfileDto } from "../dto/profile.dto";
import { ProfilesService } from "../services/profiles.service";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "../entities/user.entity";
import { UsersService } from "../services/users.service";
import { ValidateUserDto } from "../dto/validate-user.dto";

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

}