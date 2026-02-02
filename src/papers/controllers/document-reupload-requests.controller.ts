import { Body, Controller, Delete, Param, Post } from "@nestjs/common";
import { DocumentReuploadRequestsService } from "../services/document-reupload-requests.service";
import { DocumentReuploadRequestBulkCreateDto } from "../dto/reupload-request-bulk-create.dto";

@Controller('document-reupload-requests')
export class DocumentReuploadRequestsController {
  
  constructor(
    private readonly documentReuploadRequestsService: DocumentReuploadRequestsService,
  ) {}

  @Post()
  async bulkCreate(@Body() dto: DocumentReuploadRequestBulkCreateDto) {
    return this.documentReuploadRequestsService.bulkCreate(dto);
  }

  @Delete(':id')
  async cancel(@Param('id') id: number) {
    return this.documentReuploadRequestsService.cancel(id);
  }
}