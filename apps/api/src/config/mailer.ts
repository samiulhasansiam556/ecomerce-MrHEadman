import nodemailer from "nodemailer";
import { env } from "./env";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }
//   console.log("SMTP CONFIG CHECK:", {
//     host: env.SMTP_HOST,
//     port: env.SMTP_PORT,
//     userConfigured: Boolean(env.SMTP_USER),
//     passConfigured: Boolean(env.SMTP_PASS),
//     passLength: env.SMTP_PASS?.length,
//     trimmedPassLength: env.SMTP_PASS?.trim().length,
//     emailFromConfigured: Boolean(env.EMAIL_FROM),
//   });
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM || env.SMTP_USER,
    to,
    subject: "Password Reset Request",
    text: `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 30 minutes.`,
    html: `
      <h2>Password Reset</h2>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${resetUrl}">Reset Your Password</a>
      </p>
      <p>This link expires in 30 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}
