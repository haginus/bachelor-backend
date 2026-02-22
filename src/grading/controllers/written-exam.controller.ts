import { Body, Controller, Param, ParseIntPipe, Post, SerializeOptions, UploadedFile, UseInterceptors } from "@nestjs/common";
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
  @SerializeOptions({ groups: ['writtenExamGradesPublic', 'writtenExamDisputedGradesPublic'] })
  async import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.writtenExamGradesService.import(file.buffer, user);
  }


  @UserTypes(UserType.Admin)
  @Sudo()
  @Post('grades/:submissionId')
  @SerializeOptions({ groups: ['writtenExamGradesPublic', 'writtenExamDisputedGradesPublic'] })
  async gradeSubmission(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Body() dto: GradeWrittenExamDto,
    @CurrentUser() user: User,
  ) {
    return this.writtenExamGradesService.gradeSubmission(submissionId, dto, user);
  }

  @UserTypes([UserType.Admin, UserType.Secretary, UserType.Student])
  @Post('grades/:submissionId/dispute')
  @SerializeOptions({ groups: ['writtenExamGradesPublic'] })
  async disputeGrade(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @CurrentUser() user: User,
  ) {
    return this.writtenExamGradesService.disputeGrade(submissionId, user);
  }

}