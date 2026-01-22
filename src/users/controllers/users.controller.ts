import { Body, Controller, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ProfileDto } from "../dto/profile.dto";
import { ProfilesService } from "../services/profiles.service";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "../entities/user.entity";

@Controller('users')
export class UsersController {

  constructor(
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

}