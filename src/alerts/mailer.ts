import { createTransport } from "nodemailer";
import { config } from '../config/config';
import { renderFile } from 'ejs';
import { Application, User } from "../models/models";

const transporter = createTransport(config.mailerConfig as any, config.mailerOptions);

export async function sendWelcomeEmail(user, token) {
  const url = `${config.WEBSITE_URL}/login/token/${token}`;
  const html = await renderFile("./src/alerts/mail-templates/welcome.ejs", { user, url } );
  let info = await transporter.sendMail({
    to: user.email,
    subject: "Activați contul dvs.",
    html
  });
}

export async function sendResetPasswordEmail(user: User, token: string) {
  const url = `${config.WEBSITE_URL}/login/token/${token}`;
  const html = await renderFile("./src/alerts/mail-templates/reset-password.ejs", { user, url } );
  let info = await transporter.sendMail({
    to: user.email,
    subject: "Resetați parola contului dvs.",
    html
  });
}

export async function sendNewApplicationEmail(studentUser: User, teacherUser: User, application: Application) {
  const url = `${config.WEBSITE_URL}/teacher/applications/pending/${application.offerId}`;
  const html = await renderFile("./src/alerts/mail-templates/new-application.ejs", { studentUser, teacherUser, application, url } );
  let info = await transporter.sendMail({
    to: teacherUser.email,
    subject: "Cerere de asociere nouă",
    html
  });
}

export async function sendRejectedApplicationEmail(studentUser, teacherUser, application) {
  const url = `${config.WEBSITE_URL}/student/teachers`;
  const html = await renderFile("./src/alerts/mail-templates/application-rejected.ejs", { studentUser, teacherUser, application, url } );
  let info = await transporter.sendMail({
    to: studentUser.email,
    subject: "Cerere de asociere respinsă",
    html
  });
}

export async function sendAcceptedApplicationEmail(studentUser, teacherUser, application) {
  const url = `${config.WEBSITE_URL}/student/paper`;
  const html = await renderFile("./src/alerts/mail-templates/application-accepted.ejs", { studentUser, teacherUser, application, url } );
  let info = await transporter.sendMail({
    to: studentUser.email,
    subject: "Cerere de asociere acceptată",
    html
  });
}

export const sendRemovedPaperNotice = async (studentUser: User, teacherUser: User) => {
  try {
    const url = `${config.WEBSITE_URL}/student/teachers`;
    const html = await renderFile("./src/alerts/mail-templates/removed-paper-notice.ejs", { studentUser, teacherUser, url } );
    let info = await transporter.sendMail({
      to: studentUser.email,
      subject: "Asociere ruptă - Găsiți alt profesor",
      html
    });
  } catch (err) {
    console.log(err);
  }
}
