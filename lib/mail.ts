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
        from: { name: "Dipin Ellington", address: process.env.SMTP_USER || "no-reply@ellington.ae" },
        to: email,
        subject: "Reset your Ellington password",
        text: [
          "We received a request to reset your Ellington password.",
          "",
          `Reset link (valid for 30 minutes): ${resetUrl}`,
          "",
          "If you did not request this, you can safely ignore this email.",
        ].join("\n"),
        html: `<div style="background:#F3F4F8;padding:36px 16px;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #EDEEF3;border-radius:22px;overflow:hidden;">
            <div style="background:linear-gradient(160deg,#14161F 0%,#252a3d 58%,#2b2570 100%);padding:32px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle;padding:0;">
                    <div style="display:inline-block;"> <div style="display:inline-block;width:42px;height:42px;border-radius:14px;background:#ffffff;color:#4F46F5;font-weight:800;font-size:15px;line-height:42px;text-align:center;">EH</div>
                      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-.02em;vertical-align:middle;margin-left:12px;">Ellington</span></div>
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding:32px 36px;color:#14161F;">
              <h1 style="font-size:22px;font-weight:800;letter-spacing:-.03em;margin:0 0 8px;color:#14161F;">Reset your password</h1>
              <p style="font-size:14px;line-height:1.6;color:#6B7180;margin:0 0 24px;">
                We received a request to reset the password for your Ellington account. Tap the button below to choose a new password.
              </p>
              <div style="text-align:center;margin:0 0 26px;">
                <a href="${resetUrl}" style="display:inline-block;background:#4F46F5;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:12px;font-weight:700;font-size:14px;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">Reset your password</a>
              </div>
              <p style="font-size:12.5px;line-height:1.5;color:#9AA0AE;margin:0 0 20px;">
                Having trouble with the button? Copy and paste the link below into your browser:<br />
                <a href="${resetUrl}" style="color:#4F46F5;text-decoration:none;word-break:break-all;">${resetUrl}</a>
              </p>
              <div style="background:#F6F7FB;border:1px solid #EDEEF3;border-radius:12px;padding:14px 16px;">
                <p style="margin:0;font-size:12.5px;color:#6B7180;font-weight:600;">This link is valid for <span style="color:#14161F;font-weight:800;">30 minutes</span> and can only be used once.</p>
              </div>
              <p style="font-size:12.5px;line-height:1.6;color:#6B7180;margin:18px 0 0;">
                Didn't request this? No action needed. Your password will stay the same &mdash; you can safely ignore this email.
              </p>
            </div>
            <div style="background:#F3F4F8;border-top:1px solid #EDEEF3;padding:22px 36px;">
              <p style="margin:0;font-size:12px;color:#9AA0AE;font-weight:600;text-align:center;">Ellington Holdings &middot; ORN 21281 &middot; The developer sales console</p>
              <p style="margin:8px 0 0;font-size:11px;line-height:1.5;color:#B4B8C4;text-align:center;">This email was sent because someone requested a password reset for an Ellington account. Sessions are encrypted and authentication is handled server-side.</p>
            </div>
          </div>
        </div>`,
      });
      return;
    } catch (e) {
      console.error("MAIL_ERROR", e);
    }
  }

  // No SMTP configured (or send failed): surface the link server-side for local/dev use.
  console.log(`PASSWORD_RESET_LINK email=${email} url=${resetUrl}`);
}