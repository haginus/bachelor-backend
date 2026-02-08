import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUDO_KEY } from '../decorators/sudo.decorator';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SudoGuard implements CanActivate {
  constructor(private reflector: Reflector, private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresSudo = this.reflector.getAllAndOverride<boolean>(SUDO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresSudo) {
      return true;
    }
    const request = context.switchToHttp().getRequest() as Request;
    const sudoPassword = request.headers['x-sudo-password'] as string;
    const user = request.user as User;
    if (!sudoPassword || !user || user.type !== 'admin') {
      return false;
    }
    try {
      this.authService.validateUser(user.email, sudoPassword);
      return true;
    } catch {
      return false;
    }
  }
}
