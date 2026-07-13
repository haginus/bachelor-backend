import { BadRequestException, Injectable } from "@nestjs/common";
import { ImportJob } from "../../lib/classes/import-job";

@Injectable()
export class ImportJobsService {

  constructor() {}

  private jobs: Record<string, ImportJob<any, any>> = {};

  getJob(jobId: string): ImportJob<any, any> {
    const job = this.jobs[jobId];
    if(!job) {
      throw new BadRequestException(`Import job with ID ${jobId} not found`);
    }
    return job;
  }

  createJob<RowType = any, EntityType = any>(...args: ConstructorParameters<typeof ImportJob<RowType, EntityType>>): ImportJob<RowType, EntityType> {
    const job = new ImportJob<RowType, EntityType>(...args);
    this.jobs[job.id] = job;
    return job;
  }

  watchJob(jobId: string, startJob = true) {
    const job = this.getJob(jobId);
    if(startJob) {
      job.start();
    }
    return job.getEvents();
  }

}
