import nodemailer from 'nodemailer';
import { config } from '../config.js';

export function createTransporter() {
  const { smtpHost, smtpPort, smtpUser, smtpPass } = config;

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

  return null;
}

async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const transporter = createTransporter();
  const from = config.smtpFrom || `"DocApproval Engine" <${config.smtpUser || 'no-reply@docapproval.local'}>`;

  if (!transporter) {
    console.log('\n========== [EMAIL NOTIFICATION — CONSOLE LOG] ==========');
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${text}`);
    console.log('========================================================\n');
    return true;
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('[Email Delivery Error]', err);
    return false;
  }
}

// ─── 1. Project Invite Email ───────────────────────────────────────────────────

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

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Project Invitation</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:32px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:white;">📄 DocApproval Engine</div>
            <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">Document Review & Approval Workflow</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">You're Invited!</h1>
            <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
              <strong style="color:#0f172a;">${inviterName}</strong> has invited you to join the 
              <strong style="color:#2563eb;">${projectName}</strong> project as a <strong>${role}</strong>.
            </p>
            <div style="background:#f1f5f9;border-radius:10px;padding:16px 20px;margin-bottom:24px;border:1px solid #e2e8f0;">
              <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;">Assigned Role</div>
              <div style="font-size:16px;color:#2563eb;font-weight:700;margin-top:4px;">${role}</div>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;font-weight:700;font-size:15px;padding:13px 32px;border-radius:8px;text-decoration:none;">
                Accept Invitation →
              </a>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              Expires on ${expiresAt.toLocaleDateString()} · If unexpected, please ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `You've been invited by ${inviterName} to join "${projectName}" as a ${role}.\nAccept here: ${inviteUrl}`;
  return sendMail(toEmail, `You've been invited to join "${projectName}" on DocApproval Engine`, html, text);
}

// ─── 2. Reviewer Assigned / Document Submitted ─────────────────────────────────

export async function sendReviewerAssignedEmail(params: {
  toEmail: string;
  reviewerName: string;
  authorName: string;
  docTitle: string;
  docId: string;
  projectName: string;
}): Promise<boolean> {
  const { toEmail, reviewerName, authorName, docTitle, docId, projectName } = params;
  const docUrl = `${config.appBaseUrl}/documents/${docId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Review Requested</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
        <tr>
          <td style="background:linear-gradient(135deg,#0284c7,#2563eb);padding:32px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:white;">🔍 Review Requested</div>
            <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">${projectName}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Hello ${reviewerName},</h2>
            <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
              <strong style="color:#0f172a;">${authorName}</strong> has submitted a new document for your technical review:
            </p>
            <div style="background:#f0f9ff;border-left:4px solid #0284c7;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <div style="font-size:12px;color:#0369a1;font-weight:700;text-transform:uppercase;">Document Title</div>
              <div style="font-size:16px;color:#0f172a;font-weight:700;margin-top:4px;">${docTitle}</div>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${docUrl}" style="display:inline-block;background:linear-gradient(135deg,#0284c7,#2563eb);color:white;font-weight:700;font-size:15px;padding:13px 32px;border-radius:8px;text-decoration:none;">
                Open Document to Review →
              </a>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              Please review the content, leave inline comments, or request changes if needed.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hello ${reviewerName},\n${authorName} has submitted "${docTitle}" for your review in "${projectName}".\nOpen: ${docUrl}`;
  return sendMail(toEmail, `Review Requested: "${docTitle}" by ${authorName}`, html, text);
}

// ─── 3. Reviewer Requested Changes ─────────────────────────────────────────────

export async function sendChangesRequestedEmail(params: {
  toEmail: string;
  authorName: string;
  reviewerName: string;
  docTitle: string;
  docId: string;
  projectName: string;
  commentText?: string;
}): Promise<boolean> {
  const { toEmail, authorName, reviewerName, docTitle, docId, projectName, commentText } = params;
  const docUrl = `${config.appBaseUrl}/documents/${docId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Changes Requested</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
        <tr>
          <td style="background:linear-gradient(135deg,#d97706,#dc2626);padding:32px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:white;">⚠️ Changes Requested</div>
            <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">${projectName}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Hello ${authorName},</h2>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
              Reviewer <strong style="color:#0f172a;">${reviewerName}</strong> has reviewed your document 
              <strong style="color:#2563eb;">"${docTitle}"</strong> and requested revisions before approval.
            </p>
            ${
              commentText
                ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                    <div style="font-size:12px;color:#991b1b;font-weight:700;text-transform:uppercase;">Reviewer Feedback</div>
                    <div style="font-size:14px;color:#1e293b;margin-top:6px;font-style:italic;line-height:1.5;">"${commentText}"</div>
                  </div>`
                : ''
            }
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${docUrl}" style="display:inline-block;background:linear-gradient(135deg,#d97706,#dc2626);color:white;font-weight:700;font-size:15px;padding:13px 32px;border-radius:8px;text-decoration:none;">
                Update & Resubmit Revision →
              </a>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              Create a new version to address comments, resolve feedback, and resubmit.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hello ${authorName},\n${reviewerName} has requested changes on "${docTitle}".\nFeedback: ${commentText || 'See document'}\nOpen: ${docUrl}`;
  return sendMail(toEmail, `Changes Requested: "${docTitle}" by ${reviewerName}`, html, text);
}

// ─── 4. Technical Review Cleared — Ready for Approver ──────────────────────────

export async function sendStageAdvancedToApproversEmail(params: {
  toEmail: string;
  approverName: string;
  docTitle: string;
  docId: string;
  projectName: string;
}): Promise<boolean> {
  const { toEmail, approverName, docTitle, docId, projectName } = params;
  const docUrl = `${config.appBaseUrl}/documents/${docId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Approval Required</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
        <tr>
          <td style="background:linear-gradient(135deg,#4338ca,#7c3aed);padding:32px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:white;">🛡️ Executive Approval Needed</div>
            <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">${projectName}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Hello ${approverName},</h2>
            <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
              The document <strong style="color:#4338ca;">"${docTitle}"</strong> has successfully cleared all technical reviews and is now awaiting your <strong>Final Executive Approval</strong>.
            </p>
            <div style="background:#eef2ff;border-radius:10px;padding:16px 20px;margin-bottom:24px;border:1px solid #c7d2fe;">
              <div style="font-size:12px;color:#4338ca;font-weight:700;text-transform:uppercase;">Workflow Stage</div>
              <div style="font-size:16px;color:#1e1b4b;font-weight:700;margin-top:4px;">IN_APPROVAL (Reviewers Cleared ✅)</div>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${docUrl}" style="display:inline-block;background:linear-gradient(135deg,#4338ca,#7c3aed);color:white;font-weight:700;font-size:15px;padding:13px 32px;border-radius:8px;text-decoration:none;">
                Review & Grant Sign-off →
              </a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hello ${approverName},\nDocument "${docTitle}" has passed review and is waiting for your final approval.\nOpen: ${docUrl}`;
  return sendMail(toEmail, `Action Required: Final Approval for "${docTitle}"`, html, text);
}

// ─── 5. Final Approval / Rejection Decision ────────────────────────────────────

export async function sendFinalDecisionEmail(params: {
  toEmail: string;
  authorName: string;
  approverName: string;
  docTitle: string;
  docId: string;
  projectName: string;
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
}): Promise<boolean> {
  const { toEmail, authorName, approverName, docTitle, docId, projectName, decision, notes } = params;
  const docUrl = `${config.appBaseUrl}/documents/${docId}`;
  const isApproved = decision === 'APPROVED';

  const gradient = isApproved
    ? 'linear-gradient(135deg,#15803d,#16a34a)'
    : 'linear-gradient(135deg,#be123c,#e11d48)';
  const icon = isApproved ? '🎉 APPROVED' : '❌ REJECTED';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Document ${decision}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
        <tr>
          <td style="background:${gradient};padding:32px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:white;">${icon}</div>
            <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">${projectName}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Hello ${authorName},</h2>
            <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
              Approver <strong style="color:#0f172a;">${approverName}</strong> has finalized their decision on your document 
              <strong>"${docTitle}"</strong>:
            </p>
            <div style="background:${isApproved ? '#f0fdf4' : '#fff1f2'};border-left:4px solid ${isApproved ? '#16a34a' : '#e11d48'};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <div style="font-size:12px;color:${isApproved ? '#15803d' : '#be123c'};font-weight:700;text-transform:uppercase;">Final Status</div>
              <div style="font-size:18px;color:#0f172a;font-weight:800;margin-top:4px;">${decision}</div>
              ${notes ? `<div style="font-size:13px;color:#475569;margin-top:6px;font-style:italic;">"${notes}"</div>` : ''}
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${docUrl}" style="display:inline-block;background:${gradient};color:white;font-weight:700;font-size:15px;padding:13px 32px;border-radius:8px;text-decoration:none;">
                View Final Document & Audit Log →
              </a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hello ${authorName},\n"${docTitle}" has been ${decision} by ${approverName}.\nView: ${docUrl}`;
  return sendMail(toEmail, `Document ${decision}: "${docTitle}"`, html, text);
}
