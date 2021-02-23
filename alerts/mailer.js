"use strict";
const nodemailer = require("nodemailer");
const { config } = require('../config/config')

const transporter = nodemailer.createTransport(config.mailer);

// async..await is not allowed in global scope, must use a wrapper
async function main() {
  // create reusable transporter object using the default SMTP transport

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: "hagiandrei.ah@gmail.com", // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

const sendWelcomeEmail = async (user, token) => {
  let info = await transporter.sendMail({
    from: '"Platforma de asociere FMI" <noreply@asociere.fmi.unibuc.ro>', // sender address
    to: user.email, // list of receivers
    subject: "Activați contul dvs.", // Subject line
    html: `<p>Bună ziua, ${user.firstName} ${user.lastName}!<br>
    Accesați <a href="${config.WEBSITE_URL}/login/token/${token}" target="_blank">acest link</a> pentru a vă activa contul în platforma de asociere.<br>
    <br>Toate cele bune!`, // html body
  });
}

exports.sendWelcomeEmail = sendWelcomeEmail;