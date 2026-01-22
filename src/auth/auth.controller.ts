import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { User } from "src/users/entities/user.entity";
import { HydrateUser } from "./decorators/hydrate-user.decorator";

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  // TODO: Add Captcha guard
  @Post('sign-in')
  async signIn(@Req() req: any) {
    return this.authService.signIn(req.localUser);
  }

  @Get("user")
  @HydrateUser()
  async user(@CurrentUser() user: User) {
    return user;
  }


}