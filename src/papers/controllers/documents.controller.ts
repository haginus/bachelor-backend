import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { DocumentsService } from "../services/documents.service";
import { UploadDocumentDto } from "../dto/upload-document.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "src/users/entities/user.entity";
import { FileInterceptor } from "@nestjs/platform-express";
import { StreamableFile } from '@nestjs/common';
import { SignDocumentDto } from "../dto/sign-document.dto";

@Controller('documents')
export class DocumentsController {

  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Body() body: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    body.file = file;
    return this.documentsService.upload(body, user);
  }

  @Post('sign')
  async signDocument(
    @Body() body: SignDocumentDto,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.sign(body, user);
  }

  @Get('history')
  async getUploadHistory(
    @Query('paperId', ParseIntPipe) paperId: number,
    @Query('name') name: string,
  ) {
    return this.documentsService.findUploadHistory(paperId, name);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.findOne(id, user);
  }

  @Get(':id/content')
  async getDocumentContent(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    const fileBuffer = await this.documentsService.getDocumentContent(id, user);
    return new StreamableFile(fileBuffer);
  }
}