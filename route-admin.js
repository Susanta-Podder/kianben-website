'use strict';
const express         = require('express');
const router          = express.Router();
const bcrypt          = require('bcryptjs');
const db              = require('./db-init');
const { verifyAdmin } = require('./auth-middleware');
const mailer          = require('./mailer');

router.use(verifyAdmin);

function genPassword(name) {
  const words = ['Bold','Smart','Swift','Bright','Clear','Sharp','Prime','Elite','Quick','Brave'];
  const word  = words[Math.floor(Math.random() * words.length)];
  const safe  = (name||'User').trim().replace(/\s+/g,'').slice(0,7);
  const num   = Math.floor(Math.random() * 9000) + 1000;
  return `${word}${safe}${num}`;
}

router.get('/stats', (req, res) => {
  try {
    res.json({
      totalMembers:           db.count('members',       {status:'active'}),
      pendingApplications:    db.count('applications',  {status:'pending'}),
      publishedAnnouncements: db.count('announcements', {status:'approved'}),
      pendingAnnouncements:   db.count('announcements', {status:'pending'}),
      pendingOrders:          db.count('orders',        {status:'pending'}),
      recentApplications:     db.getApplications().slice(0,8),
      recentOrders:           db.getOrders().slice(0,8)
    });
  } catch(e) { res.status(500).json({ message:'Server error.' }); }
});

router.get('/pending-counts', (req, res) => {
  try {
    res.json({
      pendingAnnouncements: db.count('announcements', {status:'pending'}),
      pendingApplications:  db.count('applications',  {status:'pending'})
    });
  } catch(e) { res.status(500).json({ message:'Server error.' }); }
});

router.get('/applications', (req, res) => {
  const s = ['pending','approved','rejected'].includes(req.query.status) ? req.query.status : 'pending';
  res.json({ applications: db.getApplications({status:s}) });
});

router.post('/applications/:id/review', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10), action = req.body.action;
    if (!['approved','rejected'].includes(action))
      return res.status(400).json({ message:'Invalid action.' });
    const app = db.getApplication({ id });
    if (!app) return res.status(404).json({ message:'Not found.' });
    db.updateApplication(id, { status:action });
    if (action === 'approved') {
      if (!db.getMember({ email:app.email.toLowerCase() })) {
        const tempPassword = genPassword(app.fullName);
        db.insertMember({
          fullName:app.fullName, email:app.email.toLowerCase(),
          phone:app.phone||'', business:app.business||'',
          service:app.service||'', products:app.products||'',
          password_hash:bcrypt.hashSync(tempPassword, 10),
          status:'active', login_count:0, last_login:null,
          facebook:'', whatsapp:'', youtube:'', instagram:'', linkedin:'', bio:''
        });
        mailer.sendWelcomeEmail({ fullName:app.fullName, email:app.email, tempPassword })
          .catch(e => console.error('[mailer welcome]', e.message));
      }
    }
    if (action === 'rejected') {
      mailer.send({
        to: app.email,
        subject: 'Your KiAnben Application — Update',
        html: `<div style="font-family:'Segoe UI',Arial;padding:28px;max-width:560px">
          <h2 style="color:#08101E">KiAnben Membership Update</h2>
          <p>Hi ${app.fullName},</p>
          <p>Thank you for your interest in KiAnben. Unfortunately we were unable to approve your application at this time.</p>
          <p>You are welcome to re-apply in the future. For any questions, reach us on
            <a href="https://www.facebook.com/kianbenbd" style="color:#29ABE2">Facebook</a>.</p>
          <p>Best,<br/><strong>The KiAnben Team</strong></p>
        </div>`
      }).catch(e => console.error('[mailer reject]', e.message));
    }
    res.json({ success:true });
  } catch(e) { console.error(e); res.status(500).json({ message:'Server error.' }); }
});

router.delete('/applications/:id', (req, res) => {
  db.deleteApplication(parseInt(req.params.id, 10)); res.json({ success:true });
});

router.get('/orders', (req, res) => {
  const s = ['pending','in_progress','completed'].includes(req.query.status) ? req.query.status : 'pending';
  res.json({ orders: db.getOrders({status:s}) });
});

router.post('/orders', (req, res) => {
  try {
    const { memberName, email, product, origin, value, notes } = req.body;
    if (!memberName?.trim() || !email?.trim() || !product?.trim())
      return res.status(400).json({ message:'Name, email and product are required.' });
    const order = db.insertOrder({
      memberName:memberName.trim(), email:email.trim().toLowerCase(),
      product:product.trim(), origin:origin?.trim()||'',
      value:value?.trim()||'', notes:notes?.trim()||''
    });
    res.status(201).json({ success:true, order });
  } catch(e) { res.status(500).json({ message:'Server error.' }); }
});

router.post('/orders/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10), status = req.body.status;
  if (!['pending','in_progress','completed'].includes(status))
    return res.status(400).json({ message:'Invalid status.' });
  const o = db.updateOrder(id, {status});
  if (!o) return res.status(404).json({ message:'Not found.' });
  res.json({ success:true });
});

router.delete('/orders/:id', (req, res) => {
  db.deleteOrder(parseInt(req.params.id, 10)); res.json({ success:true });
});

router.get('/announcement-requests', (req, res) => {
  const s = ['pending','approved','rejected'].includes(req.query.status) ? req.query.status : 'pending';
  res.json({ requests: db.getAnnouncements({status:s}) });
});

// publish MUST be before /:id
router.post('/announcements/publish', (req, res) => {
  try {
    const { title, content, author } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ message:'Title and content required.' });
    db.insertAnnouncement({ title:title.trim(), content:content.trim(), author:(author||'KiAnben Admin').trim(), status:'approved', submitted_by:'admin' });
    res.status(201).json({ success:true });
  } catch(e) { res.status(500).json({ message:'Server error.' }); }
});

router.post('/announcements/:id/review', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10), action = req.body.action;
    if (!['approved','rejected'].includes(action))
      return res.status(400).json({ message:'Invalid action.' });
    const ann = db.getAnnouncement({ id });
    if (!ann) return res.status(404).json({ message:'Not found.' });
    db.updateAnnouncement(id, { status:action });
    if (action === 'approved' && ann.email) {
      mailer.send({
        to: ann.email,
        subject: '📢 Your Announcement is Live on KiAnben!',
        html: `<div style="font-family:Arial;padding:24px"><h2 style="color:#29ABE2">Your Announcement is Published!</h2><p>Hi ${ann.author}, your announcement "<strong>${ann.title}</strong>" is now live on the KiAnben community board.</p></div>`
      }).catch(e => console.error('[mailer]', e.message));
    }
    res.json({ success:true });
  } catch(e) { res.status(500).json({ message:'Server error.' }); }
});

router.delete('/announcements/:id', (req, res) => {
  db.deleteAnnouncement(parseInt(req.params.id, 10)); res.json({ success:true });
});

router.get('/members', (req, res) => {
  res.json({
    members: db.getMembers()
      .map(({ password_hash, ...m }) => m)
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  });
});

router.delete('/members/:id', (req, res) => {
  db.deleteMember(parseInt(req.params.id, 10)); res.json({ success:true });
});

router.get('/pricing', (req, res) => { res.json({ plans:db.getPricing() }); });

router.post('/pricing/update', (req, res) => {
  try {
    const plans = db.getPricing();
    const idx   = plans.findIndex(p => p.id === req.body.id);
    if (idx===-1) return res.status(404).json({ message:'Plan not found.' });
    plans[idx] = { ...plans[idx], ...req.body };
    db.setPricing(plans);
    res.json({ success:true, plans });
  } catch(e) { res.status(500).json({ message:'Server error.' }); }
});

module.exports = router;
