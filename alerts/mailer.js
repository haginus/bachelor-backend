"use strict";
const nodemailer = require("nodemailer");
const { config } = require('../config/config')
const ejs = require('ejs');

const transporter = nodemailer.createTransport(config.mailer);

const sendWelcomeEmail = async (user, token) => {
  const url = `${config.WEBSITE_URL}/login/token/${token}`;
  const html = await ejs.renderFile("./alerts//mail-templates/welcome.ejs", { user, url } );
  let info = await transporter.sendMail({
    from: '"Platforma de asociere FMI" <noreply@asociere.fmi.unibuc.ro>',
    to: user.email,
    subject: "Activați contul dvs.",
    html
  });
}

exports.sendWelcomeEmail = sendWelcomeEmail;