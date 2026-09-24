import nodemailer from 'nodemailer';
import { config } from '../config.js';

/**
 * Creates and returns a nodemailer transporter.
 * Configure SMTP_* vars in your .env to enable real email delivery.
 * If not configured, falls back to a console-only "ethereal" preview.
 */
export function createTransporter() {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = config;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // Fallback: log to console (no email actually sent)
  return null;
}

export interface SendInviteEmailParams {
  toEmail: string;
  inviterName: string;
  projectName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<boolean> {
  const { toEmail, inviterName, projectName, role, inviteUrl, expiresAt } = params;

  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Project Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:36px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:white;letter-spacing:-0.5px;">📄 DocApproval Engine</div>
              <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:6px;">Document Review & Approval Workflow</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">You're Invited!</h1>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                <strong style="color:#0f172a;">${inviterName}</strong> has invited you to join the 
                <strong style="color:#2563eb;">${projectName}</strong> project as a <strong>${role}</strong>.
              </p>

              <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:28px;border:1px solid #e2e8f0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:50%;padding:8px 0;">
                      <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Project</div>
                      <div style="font-size:15px;color:#0f172a;font-weight:700;margin-top:4px;">${projectName}</div>
                    </td>
                    <td style="width:50%;padding:8px 0;">
                      <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Your Role</div>
                      <div style="font-size:15px;color:#2563eb;font-weight:700;margin-top:4px;">${role}</div>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="text-align:center;margin-bottom:28px;">
                <a href="${inviteUrl}" 
                   style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 4px 14px rgba(37,99,235,0.35);">
                  Accept Invitation →
                </a>
              </div>

              <p style="margin:0;color:#64748b;font-size:13px;text-align:center;line-height:1.5;">
                This invitation expires on <strong>${expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.<br/>
                If you weren't expecting this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                DocApproval Engine · Document Workflow Platform<br/>
                <a href="${inviteUrl}" style="color:#2563eb;font-size:12px;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
You have been invited to join the "${projectName}" project as a ${role}.

Invited by: ${inviterName}
Project: ${projectName}
Your Role: ${role}
Expires: ${expiresAt.toLocaleDateString()}

Accept your invitation here:
${inviteUrl}

If you weren't expecting this invitation, you can safely ignore this email.
`;

  if (!transporter) {
    // No SMTP configured — log to console so devs can see the link
    console.log('\n========== [EMAIL INVITE — NO SMTP CONFIGURED] ==========');
    console.log(`TO:      ${toEmail}`);
    console.log(`SUBJECT: You've been invited to join "${projectName}"`);
    console.log(`LINK:    ${inviteUrl}`);
    console.log(`EXPIRES: ${expiresAt.toISOString()}`);
    console.log('==========================================================\n');
    return true;
  }

  try {
    await transporter.sendMail({
      from: config.smtpFrom || `"DocApproval Engine" <${config.smtpUser}>`,
      to: toEmail,
      subject: `You've been invited to join "${projectName}" on DocApproval Engine`,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('[Email Error]', err);
    return false;
  }
}
