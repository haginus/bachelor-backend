import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { ReactEmailAdapter } from './adapters/react-email.adapter';
import { mailContexts } from './mock';
import { User } from 'src/users/entities/user.entity';
import { Application } from 'src/offers/entities/application.entity';
import { SignUpRequest } from 'src/users/entities/sign-up-request.entity';
import { Paper } from 'src/papers/entities/paper.entity';
import { DocumentReuploadRequest } from 'src/papers/entities/document-reupload-request.entity';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService, private configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL')!;
    this.secretaryEmail = this.configService.get<string>('SECRETARY_EMAIL')!;
  }

  private readonly frontendUrl: string;
  private readonly secretaryEmail: string;

  async sendWelcomeEmail(user: User, token: string) {
    return this.mailerService.sendMail({
      to: user.email,
      subject: 'Activați contul dvs.',
      template: './welcome',
      context: { user, token },
    });
  }

  async sendSignUpRequestNoticeEmail(signUpRequest: SignUpRequest) {
    const url = `${this.frontendUrl}/admin/sign-up-requests?id=${signUpRequest.id}`;
    return this.mailerService.sendMail({
      to: this.secretaryEmail,
      subject: `[Finalizare studii] Cerere nouă de înregistrare de la ${signUpRequest.firstName} ${signUpRequest.lastName}`,
      template: './sign-up-request-notice',
      context: { signUpRequest, url },
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

  async sendPaperCreatedEmail(paper: Paper) {
    const url = `${this.frontendUrl}/student/paper`;
    return this.mailerService.sendMail({
      to: paper.student.email,
      subject: `Asocierea dvs. cu ${paper.teacher.firstName} ${paper.teacher.lastName}`,
      template: './paper-created',
      context: { paper, url },
    });
  }

  async sendPaperRemovedEmail(student: User, teacher: User) {
    const url = `${this.frontendUrl}/student/teachers`;
    return this.mailerService.sendMail({
      to: student.email,
      subject: 'Asociere ruptă - Găsiți alt profesor',
      template: './paper-removed',
      context: { student, teacher, url },
    });
  }

  async sendDocumentReuploadRequestNoticeEmail(user: User, requests: DocumentReuploadRequest[]) {
    const url = `${this.frontendUrl}/student/paper`;
    return this.mailerService.sendMail({
      to: user.email,
      subject: 'Solicitare de reîncărcare a documentelor',
      template: './document-reupload-request-notice',
      context: { user, requests, url },
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
