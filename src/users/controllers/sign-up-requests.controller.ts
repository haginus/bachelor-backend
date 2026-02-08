import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, StreamableFile } from "@nestjs/common";
import { SignUpRequestsService } from "../services/sign-up-requests.service";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { UserType } from "../../lib/enums/user-type.enum";
import { Public } from "../../auth/decorators/public.decorator";
import { Recaptcha } from "@nestlab/google-recaptcha";
import { SignUpRequestDto } from "../dto/sign-up-request.dto";
import { SignUpRequestPartialDto } from "../dto/sign-up-request-partial.dto";
import { DocumentGenerationService } from "../../document-generation/services/document-generation.service";

@Controller('sign-up-requests')
export class SignUpRequestsController {

  constructor(
    private readonly signUpRequestsService: SignUpRequestsService,
    private readonly documentGenerationService: DocumentGenerationService,
  ) {}

  @Get()
  @UserTypes([UserType.Admin, UserType.Secretary])
  async findAll() {
    return this.signUpRequestsService.findAll();
  }

  @Get('export/excel')
  @UserTypes([UserType.Admin, UserType.Secretary])
  async exportExcel() {
    return new StreamableFile(await this.documentGenerationService.generateSignUpRequestsExcel());
  }

  @Get(':id')
  @UserTypes([UserType.Admin, UserType.Secretary])
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.signUpRequestsService.findOne(id);
  }

  @Public()
  @Recaptcha()
  @Post()
  async create(@Body() dto: SignUpRequestDto) {
    return this.signUpRequestsService.create(dto);
  }

  @Post(':id/accept')
  @UserTypes([UserType.Admin, UserType.Secretary])
  async accept(
    @Param('id', ParseIntPipe) id: number,
    @Body() additionalChanges?: SignUpRequestPartialDto,
    ) {
    return this.signUpRequestsService.accept(id, additionalChanges);
  }

  @Delete(':id')
  @UserTypes([UserType.Admin, UserType.Secretary])
  async reject(@Param('id', ParseIntPipe) id: number) {
    return this.signUpRequestsService.reject(id);
  }
}