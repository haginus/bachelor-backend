import { Controller, Param, SerializeOptions, Sse } from "@nestjs/common";
import { ImportJobsService } from "../services/import-jobs.service";
import { map } from "rxjs";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { UserType } from "../../lib/enums/user-type.enum";

@Controller('import-jobs')
@UserTypes([UserType.Admin, UserType.Secretary])
export class ImportJobsController {

  constructor(private readonly importJobsService: ImportJobsService) {}

  @Sse(':jobId/events')
  @SerializeOptions({ groups: ['full', 'logs'] })
  watchJob(@Param('jobId') jobId: string) {
    return this.importJobsService.watchJob(jobId).pipe(
      map(event => ({ data: event })),
    );
  }

}
