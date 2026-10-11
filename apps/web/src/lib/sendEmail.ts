import nodemailer from "nodemailer";

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS
  );
}

/** Sends reset link. Returns false if SMTP is not configured (token still created in DB). */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[password-reset]", resetUrl);
      return true;
    }
    console.error(
      "[password-reset] SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS on server"
    );
    return false;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const from =
    process.env.MAIL_FROM?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    process.env.SMTP_USER!;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const subject = "BackTest Pro — сброс пароля";
  const text = `Здравствуйте!

Вы запросили сброс пароля на BackTest Pro. Ссылка действует 1 час:

${resetUrl}

Если вы не запрашивали сброс — просто проигнорируйте это письмо.
`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: `<p>Здравствуйте!</p>
<p>Вы запросили сброс пароля на <strong>BackTest Pro</strong>. Ссылка действует 1 час:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>Если вы не запрашивали сброс — проигнорируйте это письмо.</p>`,
  });

  return true;
}
