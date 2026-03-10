'use strict';
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('./db-init');

const MS = () => process.env.JWT_SECRET       || 'kianben_member_secret_change_me';
const AS = () => process.env.ADMIN_JWT_SECRET || 'kianben_admin_secret_change_me';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message:'Email and password required.' });
    const m = db.getMember({ email:email.trim().toLowerCase(), status:'active' });
    if (!m || !m.password_hash)
      return res.status(401).json({ message:'Invalid email or password.' });
    const valid = await bcrypt.compare(password, m.password_hash);
    if (!valid)
      return res.status(401).json({ message:'Invalid email or password.' });
    db.updateMember(m.id, { last_login:new Date().toISOString(), login_count:(m.login_count||0)+1 });
    const token = jwt.sign({ id:m.id, email:m.email, role:'member' }, MS(), { expiresIn:'7d' });
    const { password_hash, ...profile } = db.getMember({ id:m.id });
    res.json({ token, expiresIn:604800, user:profile });
  } catch(e) { console.error('[auth/login]', e); res.status(500).json({ message:'Server error.' }); }
});

router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message:'Username and password required.' });
    const a = db.getAdmin({ username:username.trim() });
    if (!a) return res.status(401).json({ message:'Invalid credentials.' });
    const valid = await bcrypt.compare(password, a.password_hash);
    if (!valid) return res.status(401).json({ message:'Invalid credentials.' });
    const token = jwt.sign({ id:a.id, username:a.username, role:'admin' }, AS(), { expiresIn:'8h' });
    res.json({ token, username:a.username });
  } catch(e) { console.error('[auth/admin-login]', e); res.status(500).json({ message:'Server error.' }); }
});

router.get('/verify', (req, res) => {
  try {
    const auth  = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ valid:false });
    const decoded = jwt.verify(token, MS());
    const member  = db.getMember({ id:decoded.id });
    if (!member || member.status !== 'active')
      return res.status(401).json({ valid:false });
    const { password_hash, ...profile } = member;
    res.json({ valid:true, user:profile });
  } catch { res.status(401).json({ valid:false }); }
});

router.put('/profile', (req, res) => {
  try {
    const auth  = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message:'Unauthorised.' });
    const decoded = jwt.verify(token, MS());
    const member  = db.getMember({ id:decoded.id });
    if (!member || member.status !== 'active')
      return res.status(404).json({ message:'Member not found.' });
    const allowed = ['phone','business','bio','facebook','whatsapp','youtube','instagram','linkedin'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = String(req.body[k]).trim().slice(0,500); });
    const updated = db.updateMember(member.id, updates);
    const { password_hash, ...profile } = updated;
    res.json({ success:true, user:profile });
  } catch(e) { console.error('[auth/profile]', e); res.status(500).json({ message:'Server error.' }); }
});

module.exports = router;
