// Transactional email through Brevo.
// Needs BREVO_API_KEY and BREVO_SENDER_EMAIL in .env.
import { AppError } from './db.server.js';

const DIRECT_URL = 'https://api.brevo.com/v3';

export function isEmailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendEmail({ to, subject, html }) {
  const key = process.env.BREVO_API_KEY;
  const sender = process.env.BREVO_SENDER_EMAIL;
  if (!key || !sender) throw new AppError('Email sending is not set up yet.', 'EMAIL_NOT_CONFIGURED');

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': key };

  const response = await fetch(`${DIRECT_URL}/smtp/email`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sender: { name: 'FitTrack', email: sender },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`Brevo request failed [${response.status}]: ${body}`);
    throw new AppError('The email could not be sent. Please try again in a few minutes.', 'EMAIL_FAILED');
  }
}

function layout(title, intro, buttonLabel, link, footer) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Inter,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">
    <div style="font-weight:800;font-size:18px;margin-bottom:16px"><span style="display:inline-block;background:#a3e635;color:#0b1120;border-radius:6px;padding:2px 8px;margin-right:6px">F</span>FitTrack</div>
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
    <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px">${escapeHtml(intro)}</p>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#a3e635;color:#0b1120;text-decoration:none;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px">${escapeHtml(buttonLabel)}</a>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:20px 0 0">${escapeHtml(footer)}</p>
  </div></body></html>`;
}

export function verificationEmail(name, link) {
  return layout(
    'Confirm your email',
    `Hi ${name || 'there'}, thanks for joining FitTrack. Confirm your email address to start using your account.`,
    'Verify email',
    link,
    'This link expires in 24 hours. If you did not create a FitTrack account, you can ignore this email.'
  );
}

export function resetEmail(name, link) {
  return layout(
    'Reset your password',
    `Hi ${name || 'there'}, we received a request to reset your FitTrack password.`,
    'Choose a new password',
    link,
    'This link expires in 1 hour. If you did not ask for a reset, you can ignore this email.'
  );
}
