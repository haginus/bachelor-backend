import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DocumentReuploadRequest } from "../entities/document-reupload-request.entity";
import { DataSource, In, Repository } from "typeorm";
import { DocumentReuploadRequestBulkCreateDto } from "../dto/reupload-request-bulk-create.dto";
import { PapersService } from "./papers.service";
import { MailService } from "src/mail/mail.service";

@Injectable()
export class DocumentReuploadRequestsService {
  
  constructor(
    @InjectRepository(DocumentReuploadRequest) private readonly documentReuploadRequestsRepository: Repository<DocumentReuploadRequest>,
    private readonly papersService: PapersService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  async findOne(id: number): Promise<DocumentReuploadRequest> {
    const request = await this.documentReuploadRequestsRepository.findOneBy({ id });
    if(!request) {
      throw new NotFoundException(`Cererea de reîncărcare cu id-ul ${id} nu a fost găsită.`);
    }
    return request;
  }

  async bulkCreate(dto: DocumentReuploadRequestBulkCreateDto): Promise<DocumentReuploadRequest[]> {
    const paper = await this.papersService.findOne(dto.paperId);
    if(paper.isValid !== null) {
      throw new BadRequestException('Nu se pot crea cereri de reîncărcare pentru o lucrare deja validată.');
    }
    const requests = dto.requests.map(requestDto => this.documentReuploadRequestsRepository.create({
      ...requestDto,
      paperId: dto.paperId,
    }));
    return this.dataSource.transaction(async manager => {
      await manager.delete(
        DocumentReuploadRequest, 
        { paperId: dto.paperId, documentName: In(requests.map(r => r.documentName)) }
      );
      const savedRequests = await manager.save(requests);
      await this.mailService.sendDocumentReuploadRequestNoticeEmail(paper.student, savedRequests);
      return savedRequests;
    });
  }

  async cancel(id: number): Promise<void> {
    const request = await this.findOne(id);
    await this.documentReuploadRequestsRepository.softRemove(request);
  }
}