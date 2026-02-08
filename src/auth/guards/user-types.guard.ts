import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_TYPES_KEY } from '../decorators/user-types.decorator';
import { UserType } from '../../lib/enums/user-type.enum';
import { JwtPayload } from '../../lib/interfaces/jwt-payload.interface';

@Injectable()
export class UserTypesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.getAllAndOverride<UserType[]>(USER_TYPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredTypes) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest() as { user: JwtPayload };
    return requiredTypes.some((type) => user.type == type);
  }
}
