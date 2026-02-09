import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/services/users.service';
import { compareSync, hashSync } from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { instanceToPlain } from 'class-transformer';
import { AuthResponse } from '../lib/interfaces/auth-response.interface';
import { JwtPayload } from '../lib/interfaces/jwt-payload.interface';
import { DataSource, EntityManager } from 'typeorm';
import { ActivationToken } from '../users/entities/activation-token.entity';
import { ChangePasswordWithActivationTokenDto } from './dto/change-password-with-activation-token.dto';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
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

  async findAlternativeIdentities(userId: number, email: string): Promise<User[]> {
    const users = await this.usersService.findAllByEmail(email);
    return users.filter(u => u.id !== userId);
  }

  async switch(userId: number, currentUser: JwtPayload) {
    const user = await this.usersService.findOne(userId);
    if(currentUser.email !== user.email) {
      throw new UnauthorizedException('Nu aveți permisiunea de a comuta la acest cont.');
    }
    return this.createAuthResponse(user, currentUser._impersonatedBy);
  }

  async validateSudoPassword(sudoPassword: string, user: JwtPayload): Promise<boolean> {
    return this.validateUser(user.email, sudoPassword).then(() => true).catch(() => false);
  }

  async impersonate(userId: number, impersonator: JwtPayload) {
    const user = await this.usersService.findOne(userId);
    return this.createAuthResponse(user, impersonator.id);
  }

  async releaseImpersonation(user: JwtPayload) {
    if(!user._impersonatedBy) {
      throw new UnauthorizedException();
    }
    const impersonator = await this.usersService.findOne(user._impersonatedBy);
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

  async requestPasswordReset(email: string, manager?: EntityManager) {
    manager = manager || this.dataSource.manager;
    const user = await this.usersService.findOneByEmailNullable(email, manager);
    if(!user) {
      throw new BadRequestException('Contul nu există.');
    }
    const lastTokens = await manager.find(ActivationToken, { 
      where: { user: { id: user.id }, used: false },
      order: { createdAt: 'DESC' },
      take: 3,
    });
    if(lastTokens.length >= 3 && lastTokens[0].createdAt.getTime() + 60 * 60 * 1000 > Date.now()) {
      throw new BadRequestException('Ați trimis prea multe cereri de resetare a parolei. Încercați din nou mai târziu.');
    }
    const activationToken = manager.create(ActivationToken, {
      token: randomBytes(64).toString('hex'),
      user,
    });
    try {
      await manager.save(activationToken);
      await this.mailService.sendResetPasswordEmail(user, activationToken.token).catch(() => {
        throw new InternalServerErrorException('Eroare la trimiterea e-mailului de resetare a parolei.');
      });
    } catch (error) {
      await manager.remove(activationToken).catch(() => {});
      throw error;
    }
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
    let payload: JwtPayload = { id: user.id, email: user.email, type: user.type, _impersonatedBy: impersonatedBy };
    if(impersonatedBy) {
      user._impersonatedBy = impersonatedBy;
    }
    const alternativeIdentities = await this.findAlternativeIdentities(user.id, user.email);
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: '',
      user: instanceToPlain(user, { groups: ['full'] }) as User,
      alternativeIdentities: instanceToPlain(alternativeIdentities, { groups: ['full'] }) as User[],
    };
  }
}
