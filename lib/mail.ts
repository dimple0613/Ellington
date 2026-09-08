export function buildResetUrl(token: string): string {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordReset(email: string, token: string): Promise<void> {
  const resetUrl = buildResetUrl(token);
  const smtpHost = process.env.SMTP_HOST;

  if (smtpHost) {
    try {
      // nodemailer is optional at runtime; falls back to console delivery when unavailable.
      // @ts-ignore - intentionally resolved at runtime so the Cloudflare build stays lean
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        ...(process.env.SMTP_USER
          ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } }
          : {}),
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@ellington.ae",
        to: email,
        subject: "Reset your Ellington password",
        text: [
          "We received a request to reset your Ellington password.",
          "",
          `Reset link (valid for 30 minutes): ${resetUrl}`,
          "",
          "If you did not request this, you can safely ignore this email.",
        ].join("\n"),
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#14161F">Reset your password</h2>
          <p style="color:#6B7180">We received a request to reset your Ellington password. The link below is valid for 30 minutes.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#4F46F5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Reset your password</a></p>
          <p style="color:#9AA0AE;font-size:12px">If you did not request this, you can safely ignore this email.</p>
        </div>`,
      });
      return;
    } catch (e) {
      console.error("MAIL_ERROR", e);
    }
  }

  // No SMTP configured (or send failed): surface the link server-side for local/dev use only.
  const prod = typeof process.env.NODE_ENV === "undefined" || process.env.NODE_ENV === "production";
  if (!prod) {
    console.log(`PASSWORD_RESET_LINK email=${email} url=${resetUrl}`);
  } else {
    console.log(`PASSWORD_RESET_NO_SMTP email=${email} (link omitted in production)`);
  }
}