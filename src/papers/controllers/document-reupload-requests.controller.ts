import { Body, Controller, Delete, Param, Post } from "@nestjs/common";
import { DocumentReuploadRequestsService } from "../services/document-reupload-requests.service";
import { DocumentReuploadRequestBulkCreateDto } from "../dto/reupload-request-bulk-create.dto";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../../users/entities/user.entity";

@Controller('document-reupload-requests')
export class DocumentReuploadRequestsController {
  
  constructor(
    private readonly documentReuploadRequestsService: DocumentReuploadRequestsService,
  ) {}

  @Post()
  async bulkCreate(
    @Body() dto: DocumentReuploadRequestBulkCreateDto,
    @CurrentUser() user: User,
  ) {
    return this.documentReuploadRequestsService.bulkCreate(dto, user);
  }

  @Delete(':id')
  async cancel(
    @Param('id') id: number,
    @CurrentUser() user: User,
  ) {
    return this.documentReuploadRequestsService.cancel(id, user);
  }
}