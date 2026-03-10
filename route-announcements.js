'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('./db-init');
const mailer  = require('./mailer');
const ER = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/published', (req, res) => {
  try { res.json({ announcements: db.getAnnouncements({ status:'approved' }).slice(0,30) }); }
  catch(e) { res.status(500).json({ message:'Server error.' }); }
});

router.post('/request', async (req, res) => {
  try {
    const { title, content, author, email } = req.body;
    if (!title?.trim() || !content?.trim() || !author?.trim() || !email?.trim())
      return res.status(400).json({ message:'All fields are required.' });
    if (!ER.test(email.trim()))
      return res.status(400).json({ message:'Invalid email.' });
    const pending = db.getAnnouncements({ status:'pending' })
      .filter(a => a.email?.toLowerCase() === email.trim().toLowerCase()).length;
    if (pending >= 3) return res.status(429).json({ message:'You already have 3 pending requests.' });
    db.insertAnnouncement({
      title:title.trim(), content:content.trim(),
      author:author.trim(), email:email.trim().toLowerCase(),
      status:'pending', submitted_by:'member'
    });
    mailer.notifyAdmin({
      subject:`📢 Announcement Request — ${author.trim()}`,
      html:`<div style="font-family:Arial;padding:24px"><h2 style="color:#29ABE2">Announcement Request</h2>
        <p><b>From:</b> ${author} &lt;${email}&gt;</p>
        <p><b>Title:</b> ${title}</p>
        <p style="background:#f5f5f5;padding:12px;border-radius:6px;">${content}</p>
        <a href="${process.env.SITE_URL||'http://localhost:3000'}/admin.html" style="display:inline-block;background:#29ABE2;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">Review in Admin →</a>
      </div>`
    }).catch(e => console.error('[mailer]', e.message));
    res.status(201).json({ success:true, message:'Request submitted for review.' });
  } catch(e) { res.status(500).json({ message:'Server error.' }); }
});

router.post('/quote', async (req, res) => {
  try {
    const { fullName, phone, email, products, origin, value, service, shipment, notes } = req.body;
    if (!fullName?.trim() || !phone?.trim() || !email?.trim() || !products?.trim() || !origin?.trim() || !service?.trim())
      return res.status(400).json({ message: 'Please fill all required fields.' });
    if (!ER.test(email.trim()))
      return res.status(400).json({ message: 'Invalid email address.' });

    const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/,'');
    const rows = [
      ['Full Name', fullName],['Phone', phone],['Email', email],
      ['Products', products],['Origin', origin],['Order Value', value||'—'],
      ['Service', service],['Shipment', shipment||'—'],['Notes', notes||'—'],
    ].map(([l,v]) => `<tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:10px 0;font-size:13px;color:#999;width:120px;vertical-align:top;">${l}</td>
        <td style="padding:10px 0;font-size:13px;color:#1a1a2e;font-weight:600;">${String(v).replace(/</g,'&lt;')}</td>
      </tr>`).join('');

    const adminHtml = `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:32px;">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">
  <div style="background:linear-gradient(135deg,#08101E,#0D1A2E);padding:28px 36px;border-bottom:3px solid #FFB800;">
    <h2 style="margin:0;color:#fff;font-size:20px;">💰 New Quote Request</h2>
    <p style="margin:6px 0 0;color:#FFB800;font-size:13px;">${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
  </div>
  <div style="padding:28px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    <div style="margin-top:28px;text-align:center;">
      <a href="${SITE_URL}/admin.html" style="display:inline-block;background:#FFB800;color:#08101E;font-weight:800;padding:13px 36px;border-radius:100px;text-decoration:none;font-size:14px;">View in Admin Panel →</a>
    </div>
  </div>
</div></body></html>`;

    await mailer.notifyAdmin({ subject: `💰 New Quote Request — ${fullName.trim()} (${products.trim()})`, html: adminHtml });

    const userHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>KiAnben Quote</title></head>
<body style="margin:0;padding:0;background:#0D1520;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1520;padding:40px 16px;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#08101E,#0D1A2E);border-radius:16px 16px 0 0;padding:44px 48px 36px;text-align:center;border-bottom:3px solid #FFB800;">
    <div style="font-size:30px;margin-bottom:18px;">💰</div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;">Quote Request Received!</h1>
    <p style="margin:10px 0 0;color:#FFB800;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">We'll be in touch within 24 hours</p>
  </td></tr>
  <tr><td style="background:#FFB800;padding:13px 40px;text-align:center;">
    <p style="margin:0;color:#08101E;font-weight:800;font-size:13px;">✅ YOUR IMPORT QUOTE IS BEING PREPARED ✅</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:40px 48px;">
    <p style="margin:0 0 16px;font-size:16px;color:#1a1a2e;">Hi <strong>${fullName.trim()}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.75;">Thank you for your quote request. Our import specialists at <strong style="color:#29ABE2;">KiAnben</strong> have received your enquiry and are preparing a detailed cost breakdown.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FA;border:2px solid #E0E6EF;border-radius:12px;margin-bottom:28px;">
    <tr><td style="padding:22px 26px;">
      <p style="margin:0 0 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#999;">Your Request Summary</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:13px;color:#888;padding:5px 0;width:110px;">Products</td><td style="font-size:14px;font-weight:700;color:#1a1a2e;">${products.trim()}</td></tr>
        <tr><td style="font-size:13px;color:#888;padding:5px 0;">Origin</td><td style="font-size:14px;font-weight:700;color:#1a1a2e;">${origin}</td></tr>
        <tr><td style="font-size:13px;color:#888;padding:5px 0;">Service</td><td style="font-size:14px;font-weight:700;color:#1a1a2e;">${service}</td></tr>
      </table>
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr><td align="center">
      <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#29ABE2,#1a8bbf);color:#fff;font-weight:800;font-size:15px;padding:16px 44px;border-radius:100px;text-decoration:none;">Visit KiAnben →</a>
    </td></tr></table>
    <p style="margin:0;font-size:15px;color:#444;">Need faster help? <a href="https://wa.me/${process.env.WHATSAPP_NUMBER||'8801683000984'}" style="color:#25D366;font-weight:700;">WhatsApp</a> or <a href="https://www.facebook.com/kianbenbd" style="color:#4267B2;font-weight:700;">Facebook</a>.</p>
    <p style="margin:20px 0 0;font-size:15px;color:#444;">Best regards,<br/><strong>The KiAnben Team</strong></p>
  </td></tr>
  <tr><td style="background:#08101E;border-radius:0 0 16px 16px;padding:24px 48px;text-align:center;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,.25);">© 2025 KiAnben. Sent to ${email.trim()}.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`;

    await mailer.send({ to: email.trim(), subject: '✅ KiAnben — Your Import Quote Request is Received!', html: userHtml });
    res.status(201).json({ success: true });
  } catch (e) {
    console.error('[quote]', e);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;
