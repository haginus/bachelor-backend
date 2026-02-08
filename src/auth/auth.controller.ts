import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, SerializeOptions, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { HydrateUser } from "./decorators/hydrate-user.decorator";
import { Sudo } from "./decorators/sudo.decorator";
import { ChangePasswordWithActivationTokenDto } from "./dto/change-password-with-activation-token.dto";
import { Recaptcha } from '@nestlab/google-recaptcha';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('check-activation-token')
  async checkActivationToken(
    @Body('token') token: string,
  ) {
    return this.authService.checkActivationToken(token);
  }

  @Public()
  @Post('sign-in/token')
  async changePasswordWithActivationToken(
    @Body() dto: ChangePasswordWithActivationTokenDto,
  ) {
    return this.authService.changePasswordWithActivationToken(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Recaptcha()
  @Post('sign-in')
  async signIn(@Req() req: any) {
    return this.authService.signIn(req.localUser);
  }

  @Get("user")
  @HydrateUser()
  @SerializeOptions({ groups: ['full'] })
  async user(@CurrentUser() user: User) {
    return user;
  }

  @Get("alternative-identities")
  @SerializeOptions({ groups: ['full'] })
  async alternativeIdentities(@CurrentUser() user: User) {
    return this.authService.findAlternativeIdentities(user.id, user.email);
  }

  @Post('switch/:userId')
  async switch(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: any,
  ) {
    return this.authService.switch(userId, user);
  }

  @Post('sudo')
  async sudo(
    @Body('password') password: string,
    @CurrentUser() user: any,
  ) {
    const success = await this.authService.validateSudoPassword(password, user);
    return { success };
  }

  @Sudo()
  @Post('impersonate/:userId')
  async impersonate(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: any,
  ) {
    return this.authService.impersonate(userId, user);
  }

  @Post('release')
  async release(
    @CurrentUser() user: any,
  ) {
    return this.authService.releaseImpersonation(user);
  }


}