"use strict";
const nodemailer = require("nodemailer");
const { config } = require('../config/config')
const ejs = require('ejs');

const transporter = nodemailer.createTransport(config.mailer);

exports.sendWelcomeEmail = async (user, token) => {
  const url = `${config.WEBSITE_URL}/login/token/${token}`;
  const html = await ejs.renderFile("./alerts/mail-templates/welcome.ejs", { user, url } );
  let info = await transporter.sendMail({
    from: '"Platforma de asociere FMI" <noreply@asociere.fmi.unibuc.ro>',
    to: user.email,
    subject: "Activați contul dvs.",
    html
  });
}

exports.sendRejectedApplicationEmail = async (studentUser, teacherUser, application) => {
  const url = `${config.WEBSITE_URL}/student/teachers`;
  const html = await ejs.renderFile("./alerts/mail-templates/application-rejected.ejs", { studentUser, teacherUser, application, url } );
  let info = await transporter.sendMail({
    from: '"Platforma de asociere FMI" <noreply@asociere.fmi.unibuc.ro>',
    to: studentUser.email,
    subject: "Cerere de asociere respinsă",
    html
  });
}

exports.sendAcceptedApplicationEmail = async (studentUser, teacherUser, application) => {
  const url = `${config.WEBSITE_URL}/student/paper`;
  const html = await ejs.renderFile("./alerts/mail-templates/application-accepted.ejs", { studentUser, teacherUser, application, url } );
  let info = await transporter.sendMail({
    from: '"Platforma de asociere FMI" <noreply@asociere.fmi.unibuc.ro>',
    to: studentUser.email,
    subject: "Cerere de asociere acceptată",
    html
  });
}