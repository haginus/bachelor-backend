import { createTransport } from "nodemailer";
import { config } from '../config/config';
import { renderFile } from 'ejs';

const transporter = createTransport(config.mailer);

export async function sendWelcomeEmail(user, token) {
  const url = `${config.WEBSITE_URL}/login/token/${token}`;
  const html = await renderFile("./alerts/mail-templates/welcome.ejs", { user, url } );
  let info = await transporter.sendMail({
    from: '"Platforma de asociere FMI" <noreply@asociere.fmi.unibuc.ro>',
    to: user.email,
    subject: "Activați contul dvs.",
    html
  });
}

export async function sendRejectedApplicationEmail(studentUser, teacherUser, application) {
  const url = `${config.WEBSITE_URL}/student/teachers`;
  const html = await renderFile("./alerts/mail-templates/application-rejected.ejs", { studentUser, teacherUser, application, url } );
  let info = await transporter.sendMail({
    from: '"Platforma de asociere FMI" <noreply@asociere.fmi.unibuc.ro>',
    to: studentUser.email,
    subject: "Cerere de asociere respinsă",
    html
  });
}

export async function sendAcceptedApplicationEmail(studentUser, teacherUser, application) {
  const url = `${config.WEBSITE_URL}/student/paper`;
  const html = await renderFile("./alerts/mail-templates/application-accepted.ejs", { studentUser, teacherUser, application, url } );
  let info = await transporter.sendMail({
    from: '"Platforma de asociere FMI" <noreply@asociere.fmi.unibuc.ro>',
    to: studentUser.email,
    subject: "Cerere de asociere acceptată",
    html
  });
}