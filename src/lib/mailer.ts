import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error(
      "SMTP is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in .env.local",
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    pool: true,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  return transporter;
}

export async function sendMail(options: { to: string; subject: string; text: string }) {
  const fromName = process.env.SMTP_FROM_NAME;
  const from = fromName ? `${fromName} <${process.env.SMTP_USER}>` : process.env.SMTP_USER!;

  await getTransporter().sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
}
