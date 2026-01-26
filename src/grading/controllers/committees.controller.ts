import { Body, Controller, Delete, Get, Param, ParseBoolPipe, ParseIntPipe, Post, Put } from "@nestjs/common";
import { CommitteesService } from "../services/committees.service";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";
import { CommitteeDto } from "../dto/committee.dto";

@Controller('committees')
@UserTypes([UserType.Admin, UserType.Secretary])
export class CommitteesController {

  constructor(private readonly committeesService: CommitteesService) {}

  @Get()
  async findAll() {
    return this.committeesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.committeesService.findOne(id);
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
  async markGradesFinal(
    @Param('id', ParseIntPipe) id: number,
    @Body('finalGrades', new ParseBoolPipe({ optional: true })) finalGrades: boolean = true,
  ) {
    return this.committeesService.markGradesFinal(id, finalGrades);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.committeesService.delete(id);
  }
}