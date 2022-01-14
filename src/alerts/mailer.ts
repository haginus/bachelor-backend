import { createTransport, Transporter } from "nodemailer";
import { config } from '../config/config';
import { renderFile } from 'ejs';
import { Application, Paper, User } from "../models/models";
import Mail from "nodemailer/lib/mailer";
import { sleep } from "../util/util";

interface SendInterval {
  timeStart: number;
  connectionsOpened: number;
}

interface QueueItem {
  options: Mail.Options,
  resolveFn: (value: any) => any,
  rejectFn: (value: any) => any
}

class MailSender {
  constructor(private transporter: Transporter) {
    this.transporter = transporter;
    this.lastSendInterval = { timeStart: Date.now(), connectionsOpened: 0 };
  }

  messageLimit = 10;
  connectionLimit = 1000;
  timeLimit = 60000;

  private messagesPending = 0;
  private lastSendInterval!: SendInterval;
  private queue: QueueItem[] = [];

  async sendMail(options: Mail.Options) {
    return new Promise((resolve, reject) => {
      if(this.messagesPending < this.messageLimit) {
        this.messagesPending++;
        this.transporter.sendMail(options)
          .then(resolve)
          .catch((err) => {
            console.log(err);
            reject(err);
          })
          .finally(() => {
            this.messagesPending--;
            this.takeFromQueue();
          });
      } else {
        this.queue.push({ options, resolveFn: resolve, rejectFn: reject });
      }
    });
  }

  private async takeFromQueue() {
    const item = this.queue.shift();
    if(!item) return;
    this.messagesPending++;
    if(!this.checkIntervalNotBusy()) {
      await sleep(this.intervalTimeRemaining() + 5);
    }
    this.lastSendInterval.connectionsOpened++;
    this.transporter.sendMail(item.options)
      .then(item.resolveFn)
      .catch((err) => {
        console.log(err);
        item.rejectFn(err);
      })
      .finally(() => {
        this.messagesPending--;
        this.takeFromQueue();
      });
  }

  private intervalTimeRemaining() {
    return (this.lastSendInterval.timeStart + this.timeLimit) - Date.now();
  }

  private isSameInterval() {
    return this.intervalTimeRemaining() > 0;
  }

  private checkIntervalNotBusy() {
    if(this.isSameInterval()) {
      if(this.lastSendInterval.connectionsOpened + 1 <= this.connectionLimit) {
        return true;
      }
      return false;
    } else {
      this.lastSendInterval = { timeStart: Date.now(), connectionsOpened: 0 };
      return true;
    }
  }
}

const transporter = createTransport({...config.mailerConfig, pool: true} as any, config.mailerOptions);

const mailSender = new MailSender(transporter);

export async function sendWelcomeEmail(user, token) {
  const url = `${config.WEBSITE_URL}/login/token/${token}`;
  const html = await renderFile("./src/alerts/mail-templates/welcome.ejs", { user, url } );
  let info = await mailSender.sendMail({
    to: user.email,
    subject: "Activați contul dvs.",
    html
  });
}

export async function sendResetPasswordEmail(user: User, token: string) {
  const url = `${config.WEBSITE_URL}/login/token/${token}`;
  const html = await renderFile("./src/alerts/mail-templates/reset-password.ejs", { user, url } );
  let info = await mailSender.sendMail({
    to: user.email,
    subject: "Resetați parola contului dvs.",
    html
  });
}

export async function sendNewApplicationEmail(studentUser: User, teacherUser: User, application: Application) {
  const url = `${config.WEBSITE_URL}/teacher/applications/pending/${application.offerId}`;
  const html = await renderFile("./src/alerts/mail-templates/new-application.ejs", { studentUser, teacherUser, application, url } );
  const name = `${studentUser.firstName} ${studentUser.lastName}`;
  let info = await mailSender.sendMail({
    to: teacherUser.email,
    replyTo: studentUser.email,
    subject: `Cerere de asociere nouă de la ${name}`,
    html
  });
}

export async function sendRejectedApplicationEmail(studentUser, teacherUser, application) {
  const url = `${config.WEBSITE_URL}/student/teachers`;
  const html = await renderFile("./src/alerts/mail-templates/application-rejected.ejs", { studentUser, teacherUser, application, url } );
  let info = await mailSender.sendMail({
    to: studentUser.email,
    subject: "Cerere de asociere respinsă",
    html
  });
}

export async function sendAcceptedApplicationEmail(studentUser, teacherUser, application) {
  const url = `${config.WEBSITE_URL}/student/paper`;
  const html = await renderFile("./src/alerts/mail-templates/application-accepted.ejs", { studentUser, teacherUser, application, url } );
  let info = await mailSender.sendMail({
    to: studentUser.email,
    subject: "Cerere de asociere acceptată",
    html
  });
}

export async function sendRemovedPaperNotice(studentUser: User, teacherUser: User) {
  const url = `${config.WEBSITE_URL}/student/teachers`;
  const html = await renderFile("./src/alerts/mail-templates/removed-paper-notice.ejs", { studentUser, teacherUser, url } );
  let info = await mailSender.sendMail({
    to: studentUser.email,
    subject: "Asociere ruptă - Găsiți alt profesor",
    html
  });
}

export async function sendAddedPaperNotice(studentUser: User, teacherUser: User, paper: Paper) {
  const url = `${config.WEBSITE_URL}/student/paper`;
  const html = await renderFile("./src/alerts/mail-templates/new-paper-notice.ejs", { studentUser, teacherUser, paper, url } );
  let info = await mailSender.sendMail({
    to: studentUser.email,
    replyTo: teacherUser.email,
    subject: `Asocierea dvs. cu ${teacherUser.firstName} ${teacherUser.lastName}`,
    html
  });
}

export const testEmail = async (templateName: string) => {
  const user = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@gmail.com"
  }
  const user2 = {
    firstName: "Jane",
    lastName: "Doe",
    email: "hagiandrei.ah@gmail.com"
  }
  const studentUser = user;
  const teacherUser = user2;
  const application = { 
    title: "Titlu lucrare",
    description: "Lorem ipdum dolor sit amet...",
    usedTechnologies: "Lorem ipdum dolor sit amet..."
  }
  const paper = { 
    title: "Titlu lucrare",
  }
  const url = '';
  return renderFile(`./src/alerts/mail-templates/${templateName}.ejs`, { user, studentUser, teacherUser, application, paper, url } );
};


