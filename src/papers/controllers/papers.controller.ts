import { Controller, Get } from "@nestjs/common";
import { PapersService } from "../services/papers.service";
import { Paper } from "../entities/paper.entity";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { UserTypes } from "src/auth/decorators/user-types.decorator";
import { UserType } from "src/lib/enums/user-type.enum";

@Controller('papers')
export class PapersController {

  constructor(private readonly papersService: PapersService) {}

  @UserTypes([UserType.Student, UserType.Teacher])
  @Get('me')
  async findMine(
    @CurrentUser() user: any,
  ) {
    return user.type === UserType.Student
      ? this.papersService.findOneByStudent(user.id)
      : this.papersService.findAllByTeacher(user.id);
  }

}