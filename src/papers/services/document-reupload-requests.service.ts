import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DocumentReuploadRequest } from "../entities/document-reupload-request.entity";
import { DataSource, In, Repository } from "typeorm";
import { DocumentReuploadRequestBulkCreateDto } from "../dto/reupload-request-bulk-create.dto";
import { PapersService } from "./papers.service";
import { MailService } from "../../mail/mail.service";
import { LoggerService } from "../../common/services/logger.service";
import { LogName } from "../../lib/enums/log-name.enum";
import { User } from "../../users/entities/user.entity";

@Injectable()
export class DocumentReuploadRequestsService {
  
  constructor(
    @InjectRepository(DocumentReuploadRequest) private readonly documentReuploadRequestsRepository: Repository<DocumentReuploadRequest>,
    private readonly papersService: PapersService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly loggerService: LoggerService,
  ) {}

  async findOne(id: number): Promise<DocumentReuploadRequest> {
    const request = await this.documentReuploadRequestsRepository.findOneBy({ id });
    if(!request) {
      throw new NotFoundException(`Cererea de reîncărcare cu id-ul ${id} nu a fost găsită.`);
    }
    return request;
  }

  async bulkCreate(dto: DocumentReuploadRequestBulkCreateDto, user?: User): Promise<DocumentReuploadRequest[]> {
    const paper = await this.papersService.findOne(dto.paperId);
    if(paper.isValid !== null) {
      throw new BadRequestException('Nu se pot crea cereri de reîncărcare pentru o lucrare deja validată.');
    }
    const requests = dto.requests.map(requestDto => this.documentReuploadRequestsRepository.create({
      ...requestDto,
      paperId: dto.paperId,
    }));
    return this.dataSource.transaction(async manager => {
      const requestsToDelete = await manager.find(DocumentReuploadRequest, {
        where: { paperId: dto.paperId, documentName: In(requests.map(r => r.documentName)) }
      });
      for(const request of requestsToDelete) {
        await manager.softRemove(request);
        await this.loggerService.log({ name: LogName.DocumentReuploadRequestDeleted, documentReuploadRequestId: request.id, paperId: request.paperId }, { user, manager });
      }
      const savedRequests: DocumentReuploadRequest[] = [];
      for(const request of requests) {
        const savedRequest = await manager.save(request);
        await this.loggerService.log({ name: LogName.DocumentReuploadRequestCreated, documentReuploadRequestId: savedRequest.id, paperId: savedRequest.paperId }, { user, manager });
        savedRequests.push(savedRequest);
      }
      await this.mailService.sendDocumentReuploadRequestNoticeEmail(paper.student, savedRequests);
      return savedRequests;
    });
  }

  async cancel(id: number, user?: User): Promise<void> {
    const request = await this.findOne(id);
    await this.dataSource.transaction(async manager => {
      await manager.softRemove(request);
      await this.loggerService.log({ name: LogName.DocumentReuploadRequestDeleted, documentReuploadRequestId: request.id, paperId: request.paperId }, { user, manager });
    });
  }
}