import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { setUser } from "@sentry/nestjs";
import { JwtPayload } from "src/lib/interfaces/jwt-payload.interface";

@Injectable()
export class SentryUserInterceptor implements NestInterceptor {

  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const request = ctx.switchToHttp().getRequest();
    const payload = request.user as JwtPayload;

    if(!payload?.id) {
      setUser(null);
      return next.handle();
    }

    setUser({ id: payload.id, email: payload.email, type: payload.type });
    return next.handle();
  }
}