import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { ReactEmailAdapter } from './adapters/react-email.adapter';
import { mailContexts } from './mock';
import { User } from 'src/users/entities/user.entity';
import { Application } from 'src/offers/entities/application.entity';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService, private configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL')!;
  }

  private readonly frontendUrl: string;

  async sendWelcomeEmail(user: User, token: string) {
    return this.mailerService.sendMail({
      to: user.email,
      subject: 'Activați contul dvs.',
      template: './welcome',
      context: { user, token },
    });
  }

  async sendNewApplicationEmail(studentUser: User, teacherUser: User, application: Application) {
    const url = `${this.frontendUrl}/teacher/applications/pending/${application.offerId}`;
    return this.mailerService.sendMail({
      to: teacherUser.email,
      replyTo: studentUser.email,
      subject: `Cerere de asociere nouă de la ${studentUser.firstName} ${studentUser.lastName}`,
      template: './application-received',
      context: { studentUser, teacherUser, application, url },
    });
  }

  async sendRejectedApplicationEmail(studentUser: User, teacherUser: User, application: Application) {
    const url = `${this.frontendUrl}/student/teachers`;
    return this.mailerService.sendMail({
      to: studentUser.email,
      subject: 'Cerere de asociere respinsă',
      template: './application-rejected',
      context: { studentUser, teacherUser, application, url },
    });
  }

  async sendAcceptedApplicationEmail(studentUser: User, teacherUser: User, application: Application) {
    const url = `${this.frontendUrl}/student/paper`;
    return this.mailerService.sendMail({
      to: studentUser.email,
      subject: 'Cerere de asociere acceptată',
      template: './application-accepted',
      context: { studentUser, teacherUser, application, url },
    });
  }

  async getMockMail(templateName: string) {
    const mailContext = mailContexts[templateName];
    if(!mailContext) {
      throw new BadRequestException(`No mock mail context for template ${templateName}`);
    }
    const adapter = new ReactEmailAdapter();
    const templatePath = join(__dirname, 'templates', templateName + '.js');
    return adapter.renderTemplate(templatePath, mailContext);
  }
}
