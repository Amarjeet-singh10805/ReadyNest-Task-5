import { Resend } from 'resend';
import { logger } from './logger';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  // In development — skip sending, just log it
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV] Email skipped — To: ${options.to} | Subject: ${options.subject}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SaaS Platform <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    if (error) throw new Error(error.message);

    logger.info(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}:`, error);
    throw error;
  }
};

const emailTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f9fc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
    .body { padding: 40px 32px; }
    .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .footer { padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
    .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; color: #92400e; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🚀 SaaS Platform</h1></div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} SaaS Platform. All rights reserved.</p>
      <p style="margin-top: 8px;">If you didn't request this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>
`;

export const sendVerificationEmail = async (email: string, token: string, name: string) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify your email address',
    html: emailTemplate(`
      <p>Hi ${name},</p>
      <p>Welcome to SaaS Platform! Please verify your email address to get started.</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      </div>
      <div class="divider"></div>
      <div class="warning">This link expires in 24 hours.</div>
    `, 'Verify Email'),
  });
};

export const sendPasswordResetEmail = async (email: string, token: string, name: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Reset your password',
    html: emailTemplate(`
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to create a new password.</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <div class="divider"></div>
      <div class="warning">⚠️ This link expires in 1 hour.</div>
    `, 'Reset Password'),
  });
};

export const sendInvitationEmail = async (
  email: string,
  inviterName: string,
  orgName: string,
  token: string,
  role: string
) => {
  const inviteUrl = `${process.env.FRONTEND_URL}/invitations/accept?token=${token}`;
  await sendEmail({
    to: email,
    subject: `You've been invited to join ${orgName}`,
    html: emailTemplate(`
      <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${role.replace('_', ' ')}</strong>.</p>
      <p>Click the button below to accept your invitation and create your account.</p>
      <div style="text-align: center;">
        <a href="${inviteUrl}" class="btn">Accept Invitation</a>
      </div>
      <div class="divider"></div>
      <div class="warning">This invitation expires in 7 days.</div>
    `, `Invitation to ${orgName}`),
  });
};

export const sendWelcomeEmail = async (email: string, name: string, orgName: string) => {
  await sendEmail({
    to: email,
    subject: `Welcome to ${orgName} on SaaS Platform!`,
    html: emailTemplate(`
      <p>Hi ${name},</p>
      <p>You're now part of <strong>${orgName}</strong> on SaaS Platform.</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Go to Dashboard</a>
      </div>
    `, 'Welcome!'),
  });
};