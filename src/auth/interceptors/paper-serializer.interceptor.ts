import {
  CallHandler,
  ExecutionContext,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { Observable, map } from 'rxjs';
import { DocumentCategory } from 'src/lib/enums/document-category.enum';
import { UserType } from 'src/lib/enums/user-type.enum';
import { Paper } from 'src/papers/entities/paper.entity';
import { User } from 'src/users/entities/user.entity';

export function PaperInterceptor(
  extractor?: (value: any) => Paper | Paper[] | undefined,
): Type<NestInterceptor> {

  class MixinInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const { user } = context.switchToHttp().getRequest() as { user: User };

      return next.handle().pipe(
        map((data) => {
          const serializedData = instanceToPlain(data);
          const papers = extractor?.(serializedData) || serializedData;
          if (!papers) return serializedData;

          if (Array.isArray(papers)) {
            Object.assign(papers, papers.map((paper) => this.serializePaper(paper, user)));
          } else {
            Object.assign(papers, this.serializePaper(papers, user));
          }
          return serializedData;
        }),
      );
    }

    private serializePaper(paper: Partial<Paper>, user: User): Partial<Paper> {
      if(user.type === UserType.Teacher) {
        paper.requiredDocuments = paper.requiredDocuments?.filter(document => document.category === DocumentCategory.PaperFiles);
        paper.documents = paper.documents?.filter(document => document.category === DocumentCategory.PaperFiles);
      }
      if(user.type === UserType.Student) {
        paper.grades = undefined;
      }
      return paper;
    }
  }

  return mixin(MixinInterceptor);
}
