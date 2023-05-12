const nodemailer = require('nodemailer');

const sendEmail = async (options) => {

     // TO DO
    // something's going weird with the process.env... need to extract this shite out
    const transporter = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth : {
            user: 'd9448d434a7351',
            pass: 'efa97e02d88b72'
        }
    });


    const message = {
        from: `${process.env.SMTP_FROM_NAME} < ${process.env.SMTP_FROM_EMAIL}`,
        to: options.email,
        subject: options.subject,
        text: options.message
    }

    await transporter.sendMail(message);
}

module.exports = sendEmail;