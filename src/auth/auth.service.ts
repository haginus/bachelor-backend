import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/services/users.service';
import { compareSync, hashSync } from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { instanceToPlain } from 'class-transformer';
import { AuthResponse } from 'src/lib/interfaces/auth-response.interface';
import { JwtPayload } from 'src/lib/interfaces/jwt-payload.interface';
import { DataSource } from 'typeorm';
import { ActivationToken } from 'src/users/entities/activation-token.entity';
import { ChangePasswordWithActivationTokenDto } from './dto/change-password-with-activation-token.dto';

@Injectable()
export class AuthService {

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmailNullable(email);
    if(!user) {
      throw new UnauthorizedException('E-mailul nu a fost găsit.', 'EMAIL_NOT_FOUND');
    }
    if(!user.password) {
      throw new UnauthorizedException('Verificați-vă e-mailul pentru a activa acest cont.', 'NOT_ACTIVATED');
    }
    if(!compareSync(pass, user.password)) {
      throw new UnauthorizedException('Parola este incorectă.', 'INVALID_PASSWORD');
    }
    return user;
  }

  signIn(user: User) {
    return this.createAuthResponse(user);
  }

  async validateSudoPassword(sudoPassword: string, user: JwtPayload): Promise<boolean> {
    return this.validateUser(user.email, sudoPassword).then(() => true).catch(() => false);
  }

  async impersonate(userId: number, impersonator: JwtPayload) {
    const user = await this.usersService.findOne(userId);
    return this.createAuthResponse(user, impersonator.id);
  }

  async releaseImpersonation(user: JwtPayload) {
    if(!user.impersonatedBy) {
      throw new UnauthorizedException();
    }
    const impersonator = await this.usersService.findOne(user.impersonatedBy);
    return this.createAuthResponse(impersonator);
  }

  private async _findActivationToken(token: string) {
    const activationToken = await this.dataSource.getRepository(ActivationToken).findOne({ 
      where: { token, used: false },
      relations: { user: true },
    });
    if(!activationToken) {
      throw new UnauthorizedException('Cod de activare invalid sau expirat.', 'INVALID_ACTIVATION_CODE');
    }
    return activationToken;
  }

  async checkActivationToken(token: string): Promise<{ isSignUp: boolean; email: string; firstName: string; }> {
    const activationToken = await this._findActivationToken(token);
    return { 
      isSignUp: !activationToken.user.password,
      email: activationToken.user.email,
      firstName: activationToken.user.firstName 
    };
  }

  async changePasswordWithActivationToken({ token, newPassword }: ChangePasswordWithActivationTokenDto): Promise<AuthResponse> {
    const activationToken = await this._findActivationToken(token);
    const user = activationToken.user;
    return this.dataSource.transaction(async manager => {
      activationToken.used = true;
      user.password = hashSync(newPassword, 10);
      await manager.save(activationToken);
      await manager.save(user);
      return this.createAuthResponse(await this.usersService.findOne(user.id));
    });
  }

  private async createAuthResponse(user: User, impersonatedBy?: number): Promise<AuthResponse> {
    let payload: JwtPayload = { id: user.id, email: user.email, type: user.type, impersonatedBy };
    if(impersonatedBy) {
      user.isImpersonated = true;
    }
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: '',
      user: instanceToPlain(user, { groups: ['full'] }) as User,
    };
  }
}
