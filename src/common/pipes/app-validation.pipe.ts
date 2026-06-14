import {
  ArgumentMetadata,
  Injectable,
  Scope,
  ValidationPipe,
  Inject,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { JwtPayload } from '../../lib/interfaces/jwt-payload.interface';

@Injectable({ scope: Scope.REQUEST })
export class AppValidationPipe extends ValidationPipe {
  constructor(@Inject(REQUEST) private readonly request: Request) {
    super({
      transform: true,
      whitelist: true,
      always: true,
    });
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    const user = this.request.user as JwtPayload | undefined;
    const groups = user ? [`type:${user.type}`] : [];
    this.transformOptions = {
      ...this.transformOptions,
      groups,
    };
    this.validatorOptions = {
      ...this.validatorOptions,
      groups,
    };
    return super.transform(value, metadata);
  }
}