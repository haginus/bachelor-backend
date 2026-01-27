import { Controller, Get, Param, ParseIntPipe, Put, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { SignaturesService } from "../services/signatures.service";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "src/users/entities/user.entity";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller('signatures')
export class SignaturesController {

  constructor(private readonly signaturesService: SignaturesService) {}

  @Get('user/:userId')
  async findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: User,
  ) {
    return this.signaturesService.findOneByUserId(userId, user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.signaturesService.findOne(id, user);
  }

  @Get(':id/sample')
  async findSample(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    const sample = await this.signaturesService.getSignatureSample(id, user);
    return new StreamableFile(sample, { type: 'image/png' });
  }

  @UseInterceptors(FileInterceptor('sample'))
  @Put('user/:userId')
  async createOrUpdate(
    @Param('userId', ParseIntPipe) userId: number,
    @UploadedFile() sample: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.signaturesService.createOrUpdate(userId, sample.buffer, user);
  }
}