import nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMailGmail(opts: MailOptions) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER || 'ryegin07@gmail.com';
  const pass = process.env.SMTP_PASS || 'wiew vpyg aslk ejns';
  const from = process.env.SMTP_FROM || user || 'Byte Rushers <byte-rushers@gmail.com>';

  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_PASS must be set in environment');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
