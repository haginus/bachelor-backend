import { Body, Controller, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import { Public } from "src/auth/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "src/auth/guards/optional-jwt-auth.guard";
import { FeedbackDto } from "./feedback.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "src/users/entities/user.entity";
import { FeedbackService } from "./feedback.service";
import { HydrateUser } from "src/auth/decorators/hydrate-user.decorator";

@Controller('feedback')
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class FeedbackController {

  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HydrateUser()
  sendFeedback(
    @Body() dto: FeedbackDto,
    @CurrentUser() user?: User,
  ) {
    if(user) {
      dto.user = user;
    } else if(!dto.user) {
      throw new UnauthorizedException('Precizați numele și prenumele în cazul în care nu sunteți autentificat.');
    }
    return this.feedbackService.sendFeedback(dto);
  }
}