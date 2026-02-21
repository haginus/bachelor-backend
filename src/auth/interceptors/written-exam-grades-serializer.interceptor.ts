import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { Observable, map } from 'rxjs';
import { UserType } from '../../lib/enums/user-type.enum';
import { User } from '../../users/entities/user.entity';
import { SessionSettingsService } from '../../common/services/session-settings.service';

@Injectable()
export class WrittenExamGradesSerializer implements NestInterceptor {

  constructor(private readonly sessionSettingsService: SessionSettingsService) { }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const { user } = context.switchToHttp().getRequest() as { user: User };
    const sessionSettings = await this.sessionSettingsService.getSettings();
    return next.handle().pipe(
      map((data) => {
        const groups: string[] = [];
        const isAdminOrSecretary = user.type === UserType.Admin || user.type === UserType.Secretary;
        if (sessionSettings.writtenExamGradesPublic || isAdminOrSecretary) {
          groups.push('writtenExamGradesPublic');
        }
        if (sessionSettings.writtenExamDisputedGradesPublic || isAdminOrSecretary) {
          groups.push('writtenExamDisputedGradesPublic');
        }
        const serializedData = instanceToPlain(data, { groups });
        return serializedData;
      }),
    );
  }
}

