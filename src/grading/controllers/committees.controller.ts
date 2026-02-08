import { Body, Controller, Delete, Get, Param, ParseArrayPipe, ParseBoolPipe, ParseIntPipe, Patch, Post, Put, StreamableFile, UseInterceptors } from "@nestjs/common";
import { CommitteesService } from "../services/committees.service";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { CommitteeDto } from "../dto/committee.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "src/users/entities/user.entity";
import { GradePaperDto } from "../dto/grade-paper.dto";
import { PaperInterceptor } from "src/auth/interceptors/paper-serializer.interceptor";
import { SchedulePapersDto } from "../dto/schedule-papers.dto";
import { PaperAutoAssignService } from "../services/paper-auto-assign.service";

@Controller('committees')
@UserTypes([UserType.Admin, UserType.Secretary])
export class CommitteesController {

  constructor(
    private readonly committeesService: CommitteesService,
    private readonly paperAutoAssignService: PaperAutoAssignService,
  ) {}

  @Get()
  async findAll() {
    return this.committeesService.findAll();
  }

  @Get('me')
  @UserTypes([UserType.Teacher])
  async findMine(
    @CurrentUser() user: User,
  ) {
    return this.committeesService.findByTeacher(user.id);
  }

  @Get(':id')
  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Teacher])
  @UseInterceptors(PaperInterceptor((committee) => committee.papers))
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.committeesService.findOne(id, user);
  }

  @Post()
  async create(@Body() dto: CommitteeDto) {
    return this.committeesService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommitteeDto
  ) {
    return this.committeesService.update(id, dto);
  }

  @Put(':id/final-grades')
  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Teacher])
  async markGradesFinal(
    @Param('id', ParseIntPipe) id: number,
    @Body('finalGrades', new ParseBoolPipe({ optional: true })) finalGrades: boolean = true,
    @CurrentUser() user: User,
  ) {
    return this.committeesService.markGradesFinal(id, finalGrades, user);
  }

  @Post('auto-assign-papers')
  async autoAssignPapers() {
    return this.paperAutoAssignService.autoAssignPapers();
  }

  @Put(':id/papers')
  async setPapers(
    @Param('id', ParseIntPipe) id: number,
    @Body('paperIds', new ParseArrayPipe({ items: Number })) paperIds: number[],
    @CurrentUser() user: User,
  ) {
    return this.committeesService.setPapers(id, paperIds, user);
  }

  @Patch(':committeeId/schedule-papers')
  @UserTypes([UserType.Teacher])
  async schedulePapers(
    @Param('committeeId', ParseIntPipe) committeeId: number,
    @Body() dto: SchedulePapersDto,
    @CurrentUser() user: User,
  ) {
    dto.committeeId = committeeId;
    return this.committeesService.schedulePapers(dto, user);
  }

  @Post(':committeeId/grade-paper')
  @UserTypes([UserType.Teacher])
  async gradePaper(
    @Param('committeeId', ParseIntPipe) committeeId: number,
    @Body() dto: GradePaperDto,
    @CurrentUser() user: User,
  ) {
    dto.committeeId = committeeId;
    return this.committeesService.gradePaper(dto, user);
  }

  @Get(':id/files/:fileName')
  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Teacher])
  async generateCommitteeFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileName') fileName: string,
  ) {
    const buffer = await this.committeesService.generateCommitteeFile(id, fileName);
    return new StreamableFile(buffer);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.committeesService.delete(id);
  }
}