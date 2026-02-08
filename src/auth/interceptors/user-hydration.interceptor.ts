import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtPayload } from "../../lib/interfaces/jwt-payload.interface";
import { UsersService } from "../../users/services/users.service";
import { HYDRATE_USER_KEY } from "../decorators/hydrate-user.decorator";

@Injectable()
export class UserHydrationInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const hydrateUser = this.reflector.get<boolean>(
      HYDRATE_USER_KEY,
      ctx.getHandler(),
    );

    if (!hydrateUser) {
      return next.handle();
    }

    const request = ctx.switchToHttp().getRequest();
    const payload = request.user as JwtPayload;

    if(!payload?.id) {
      return next.handle();
    }

    request.user = await this.usersService.findOne(payload.id);
    if(payload._impersonatedBy) {
      request.user._impersonatedBy = payload._impersonatedBy;
    }
    return next.handle();
  }
}