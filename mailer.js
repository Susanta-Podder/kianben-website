'use strict';
const nodemailer  = require('nodemailer');
const ADMIN_EMAIL = process.env.EMAIL_USER || 'susantapodder333@gmail.com';
const SITE_URL    = (process.env.SITE_URL  || 'http://localhost:3000').replace(/\/$/,'');
const WA_NUM      = process.env.WHATSAPP_NUMBER || '8801683000984';

let _t = null;
function getT() {
  if (_t) return _t;
  if (!process.env.EMAIL_PASS) {
    return {
      sendMail: async o => {
        console.log('\n[mailer] ── EMAIL STUB (set EMAIL_PASS in .env to send real emails) ──');
        console.log('  To:      ', o.to);
        console.log('  Subject: ', o.subject);
        console.log('────────────────────────────────────────────────────────────\n');
        return {};
      }
    };
  }
  _t = nodemailer.createTransport({ service:'gmail', auth:{ user:ADMIN_EMAIL, pass:process.env.EMAIL_PASS } });
  return _t;
}

const send = ({to,subject,html}) =>
  getT().sendMail({ from:`"KiAnben Community" <${ADMIN_EMAIL}>`, to, subject, html });

const notifyAdmin = ({subject,html}) => send({ to:ADMIN_EMAIL, subject, html });

/* ═══════════════════════════════════════════════════════════════════
   WELCOME EMAIL
   Sent when admin approves a membership application.
   Includes email + password credentials and a Sign In button.
   ═══════════════════════════════════════════════════════════════════ */
async function sendWelcomeEmail({ fullName, email, tempPassword }) {
  const perks = [
    ['🚢','Join shared import batches at just 1% commission'],
    ['📦','Request A-Z import support for your products'],
    ['📢','Submit announcements to the community board'],
    ['💬','Connect with our team on WhatsApp for instant support'],
    ['🌏','Access verified sourcing from 15+ countries worldwide'],
    ['👤','Build your member profile with your social media links']
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Welcome to KiAnben</title></head>
<body style="margin:0;padding:0;background:#0D1520;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1520;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- ▸ HEADER -->
  <tr><td style="background:linear-gradient(135deg,#08101E 0%,#0D1A2E 100%);border-radius:16px 16px 0 0;padding:48px 48px 40px;text-align:center;border-bottom:3px solid #29ABE2;">
    <table align="center" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td align="center" style="width:72px;height:72px;background:#29ABE2;border-radius:50%;font-size:34px;line-height:72px;">✈</td></tr>
    </table>
    <h1 style="margin:0;font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Welcome to KiAnben!</h1>
    <p style="margin:10px 0 0;color:#29ABE2;font-size:13px;letter-spacing:2.5px;text-transform:uppercase;font-weight:700;">Membership Approved</p>
  </td></tr>

  <!-- ▸ GOLD BANNER -->
  <tr><td style="background:#FFB800;padding:14px 40px;text-align:center;">
    <p style="margin:0;color:#08101E;font-weight:800;font-size:13px;letter-spacing:0.8px;">🎉 &nbsp;YOU ARE NOW A KIANBEN COMMUNITY MEMBER&nbsp; 🎉</p>
  </td></tr>

  <!-- ▸ BODY -->
  <tr><td style="background:#ffffff;padding:44px 48px;">

    <p style="margin:0 0 18px;font-size:16px;color:#1a1a2e;line-height:1.7;">Hi <strong>${fullName}</strong>,</p>
    <p style="margin:0 0 18px;font-size:15px;color:#444;line-height:1.75;">
      We are thrilled to welcome you to <strong style="color:#29ABE2;">KiAnben</strong> — Bangladesh's trusted community
      for smart, middleman-free importing. Your application has been reviewed and
      <strong style="color:#27ae60;">approved</strong>.
    </p>
    <p style="margin:0 0 30px;font-size:15px;color:#444;line-height:1.75;">
      Use the credentials below to sign in. You can update your password from your profile after signing in.
    </p>

    <!-- ▸ CREDENTIALS BOX -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
    <tr><td style="background:#F4F7FA;border:2px solid #E0E6EF;border-radius:12px;padding:24px 28px;">
      <p style="margin:0 0 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#999;">Your Sign-In Credentials</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#888;width:90px;vertical-align:middle;">Email</td>
          <td style="padding:8px 0;"><span style="font-size:14px;font-weight:700;color:#1a1a2e;background:#fff;border:1px solid #ddd;padding:7px 14px;border-radius:7px;display:inline-block;">${email}</span></td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#888;vertical-align:middle;">Password</td>
          <td style="padding:8px 0;"><span style="font-size:15px;font-weight:700;color:#1a1a2e;background:#fff;border:1px solid #ddd;padding:7px 14px;border-radius:7px;display:inline-block;font-family:monospace;letter-spacing:2px;">${tempPassword}</span></td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-size:12px;color:#e67e22;">⚠️ Please keep these credentials safe. Do not share your password with anyone.</p>
    </td></tr>
    </table>

    <!-- ▸ SIGN IN BUTTON -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:34px;">
    <tr><td align="center">
      <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#29ABE2 0%,#1a8bbf 100%);color:#ffffff;font-weight:800;font-size:16px;padding:17px 52px;border-radius:100px;text-decoration:none;letter-spacing:0.3px;">
        Sign In to KiAnben &nbsp;→
      </a>
    </td></tr>
    </table>

    <!-- ▸ WHAT YOU CAN DO -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border-radius:12px;margin-bottom:30px;">
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#29ABE2;">What you can do now</p>
      ${perks.map(([icon,text])=>`
      <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr>
        <td style="width:28px;font-size:17px;vertical-align:top;padding-top:1px;">${icon}</td>
        <td style="font-size:14px;color:#333;line-height:1.5;">${text}</td>
      </tr></table>`).join('')}
    </td></tr>
    </table>

    <p style="margin:0 0 6px;font-size:15px;color:#444;line-height:1.7;">
      Have questions? Reach us on
      <a href="https://www.facebook.com/kianbenbd" style="color:#4267B2;font-weight:700;text-decoration:none;">Facebook</a>
      or
      <a href="https://wa.me/${WA_NUM}" style="color:#25D366;font-weight:700;text-decoration:none;">WhatsApp</a>.
    </p>
    <p style="margin:22px 0 0;font-size:15px;color:#444;line-height:1.7;">
      With gratitude,<br/>
      <strong style="color:#1a1a2e;">The KiAnben Team</strong><br/>
      <span style="color:#aaa;font-size:13px;">Bangladesh's #1 Import Community</span>
    </p>

  </td></tr>

  <!-- ▸ FOOTER -->
  <tr><td style="background:#08101E;border-radius:0 0 16px 16px;padding:26px 48px;text-align:center;">
    <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,.35);">© 2025 KiAnben. All rights reserved.</p>
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,.2);">
      This email was sent to ${email} because you applied for KiAnben membership.<br/>
      If this was not you, please ignore this email.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  return send({ to:email, subject:'🎉 Welcome to KiAnben — Your Membership is Approved!', html });
}

/* ═══════════════════════════════════════════════════════════════════
   ADMIN NOTIFICATION — new membership application received
   ═══════════════════════════════════════════════════════════════════ */
async function sendApplicationNotification(app) {
  const rows = [
    ['Full Name',  app.fullName],
    ['Email',      app.email],
    ['Phone',      app.phone    || '—'],
    ['Business',   app.business || '—'],
    ['Products',   app.products],
    ['Service',    app.service],
    ['Volume',     app.volume   || '—'],
    ['Referral',   app.referral || '—'],
  ].map(([l,v]) => `
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:10px 0;font-size:13px;color:#999;width:110px;vertical-align:top;">${l}</td>
      <td style="padding:10px 0;font-size:13px;color:#1a1a2e;font-weight:600;">${v}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:32px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">
  <div style="background:linear-gradient(135deg,#08101E,#0D1A2E);padding:28px 36px;border-bottom:3px solid #29ABE2;">
    <h2 style="margin:0;color:#fff;font-size:20px;">🆕 New Membership Application</h2>
    <p style="margin:6px 0 0;color:#29ABE2;font-size:13px;">Application #${app.id} · ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
  </div>
  <div style="padding:28px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${app.message ? `<div style="margin-top:18px;background:#f8f9ff;border-radius:8px;padding:14px;font-size:13px;color:#555;line-height:1.6;">${app.message}</div>` : ''}
    <div style="margin-top:28px;text-align:center;">
      <a href="${SITE_URL}/admin.html" style="display:inline-block;background:#29ABE2;color:#fff;font-weight:700;padding:13px 36px;border-radius:100px;text-decoration:none;font-size:14px;">Review in Admin Panel →</a>
    </div>
  </div>
</div>
</body></html>`;

  return notifyAdmin({ subject:`🆕 New Application — ${app.fullName}`, html });
}

module.exports = { send, notifyAdmin, sendWelcomeEmail, sendApplicationNotification };
