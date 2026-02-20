import { Body, Controller, Param, ParseIntPipe, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { WrittenExamGradesService } from "../services/written-exam-grades.service";
import { GradeWrittenExamDto } from "../dto/grade-written-exam.dto";
import { UserTypes } from "../../auth/decorators/user-types.decorator";
import { UserType } from "../../lib/enums/user-type.enum";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../../users/entities/user.entity";
import { Sudo } from "../../auth/decorators/sudo.decorator";

@Controller('written-exam')
@UserTypes([UserType.Admin, UserType.Secretary])
export class WrittenExamController {

  constructor(
    private readonly writtenExamGradesService: WrittenExamGradesService,
  ) {}

  @UserTypes(UserType.Admin)
  @Sudo()
  @Post('grades/import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.writtenExamGradesService.import(file.buffer, user);
  }


  @UserTypes(UserType.Admin)
  @Sudo()
  @Post('grades/:submissionId')
  async gradeSubmission(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Body() dto: GradeWrittenExamDto,
  ) {
    return this.writtenExamGradesService.gradeSubmission(submissionId, dto);
  }

}