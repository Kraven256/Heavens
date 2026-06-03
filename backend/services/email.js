// ================================================
//  services/email.js — Resend Email Service
//  Sends password-reset OTP codes to users
// ================================================
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// NOTE: For production, verify your domain at resend.com/domains
// and set EMAIL_FROM=YourApp <no-reply@yourdomain.com> in .env
// Until then, onboarding@resend.dev only sends to your Resend account email.
const FROM_EMAIL = process.env.EMAIL_FROM || 'InternUG <onboarding@resend.dev>';

/**
 * Sends a 6-digit password reset code to the user's email.
 * @param {string} toEmail  - Recipient email address
 * @param {string} name     - Recipient's display name
 * @param {string} code     - 6-digit reset code
 */
async function sendPasswordResetEmail(toEmail, name, code) {
  // In development (no API key), just log the code to the console
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[DEV — Email not sent] Password reset code for ${toEmail}: ${code}\n`);
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Password Reset — InternUG</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#1a1a2e;border-radius:16px;overflow:hidden;
                      box-shadow:0 8px 40px rgba(0,0,0,0.5);max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c3de8 0%,#3d7af5 100%);
                        padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                🎓 InternUG
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:1px;
                         text-transform:uppercase;">Uganda Internship Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#a0a0c0;font-size:14px;">Hello, <strong style="color:#e0e0f0;">${name}</strong></p>
              <h2 style="margin:0 0 24px;color:#ffffff;font-size:22px;font-weight:600;">
                Password Reset Request
              </h2>
              <p style="margin:0 0 28px;color:#9090b0;font-size:15px;line-height:1.6;">
                We received a request to reset your InternUG password.
                Use the code below — it expires in <strong style="color:#e0e0f0;">15 minutes</strong>.
              </p>

              <!-- OTP Code Box -->
              <div style="background:#0f0f1a;border:2px solid #6c3de8;border-radius:12px;
                           padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#9090b0;font-size:12px;letter-spacing:2px;
                            text-transform:uppercase;">Your Reset Code</p>
                <p style="margin:0;color:#ffffff;font-size:42px;font-weight:700;letter-spacing:14px;
                            font-family:'Courier New',monospace;">${code}</p>
              </div>

              <p style="margin:0 0 24px;color:#9090b0;font-size:13px;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.
                Your password will <strong style="color:#e0e0f0;">not</strong> be changed unless
                you enter this code.
              </p>

              <hr style="border:none;border-top:1px solid #2a2a4a;margin:0 0 24px;"/>
              <p style="margin:0;color:#606080;font-size:12px;text-align:center;">
                &copy; ${new Date().getFullYear()} InternUG · Uganda Internship Placement Portal<br/>
                This is an automated email — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to:   toEmail,
    subject: `Your InternUG Reset Code: ${code}`,
    html,
  });

  if (error) {
    console.error('[Email] Resend error:', error);
    throw new Error('Failed to send reset email. Please try again.');
  }

  console.log(`[Email] Reset code sent to ${toEmail}`);
}

/**
 * Notifies a student that their internship application was approved or rejected.
 */
async function sendApplicationStatusEmail({ toEmail, name, status, internshipTitle, companyName }) {
  const approved = status === 'approved';
  const subject = approved
    ? `Application approved — ${internshipTitle}`
    : `Application update — ${internshipTitle}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[DEV — Email not sent] Application ${status} for ${toEmail}: ${internshipTitle} at ${companyName}\n`);
    return;
  }

  const accent = approved ? '#1e293b' : '#e07a5f';
  const headline = approved ? 'Your application was approved!' : 'Your application was not successful';
  const message = approved
    ? `Congratulations! <strong>${companyName}</strong> has approved your application for <strong>${internshipTitle}</strong>. Sign in to InternUG to view next steps and await placement confirmation.`
    : `Thank you for applying. Unfortunately, <strong>${companyName}</strong> has declined your application for <strong>${internshipTitle}</strong>. You may browse other openings on InternUG.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#EAEDF0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;border:1px solid #d8deea;">
        <tr>
          <td style="background:${accent};padding:28px 36px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;">InternUG</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Application notification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <p style="margin:0 0 8px;color:#8a8a9a;font-size:14px;">Hello, <strong style="color:#1a2744;">${name}</strong></p>
            <h2 style="margin:0 0 20px;color:#1a2744;font-size:20px;">${headline}</h2>
            <p style="margin:0 0 24px;color:#4a4a5a;font-size:15px;line-height:1.6;">${message}</p>
            <p style="margin:0;color:#8a8a9a;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} InternUG · Uganda Internship Placement Portal
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const { error } = await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html });
  if (error) {
    console.error('[Email] Application status error:', error);
    throw new Error('Failed to send application notification email.');
  }
  console.log(`[Email] Application ${status} notification sent to ${toEmail}`);
}

module.exports = { sendPasswordResetEmail, sendApplicationStatusEmail };
