import { Injectable } from "@nestjs/common";
import { FeedbackDto } from "./feedback.dto";
import { MailService } from "src/mail/mail.service";

@Injectable()
export class FeedbackService {

  constructor(
    private readonly mailService: MailService,
  ) {}

  async sendFeedback(dto: FeedbackDto) {
    await this.mailService.sendFeedbackEmail(dto);
  }
}