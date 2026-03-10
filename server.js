'use strict';
require('dotenv').config();
const express   = require('express');
const path      = require('path');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/api', rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false }));

/* ══ Admin panel IP guard ═══════════════════════════════════
   Set ADMIN_IP in your .env to restrict access to your IP only.
   Find your IP at: https://www.whatismyip.com
   Leave ADMIN_IP empty to allow all (less secure).
   ══════════════════════════════════════════════════════════ */
app.use('/admin.html', (req, res, next) => {
  const allowedIP = process.env.ADMIN_IP || '';
  if (!allowedIP) return next();
  const clientIP = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (clientIP.includes(allowedIP)) return next();
  console.warn(`[admin] Blocked IP: ${clientIP}`);
  return res.status(403).send('<html><body style="font-family:sans-serif;text-align:center;padding:80px"><h2>403 — Access Denied</h2></body></html>');
});

/* ══ Static front-end files ═════════════════════════════════
   All front-end files live in the same folder as server.js.
   Only these specific files are served publicly — server-side
   files like server.js, route-*.js, .env are never exposed.
   ══════════════════════════════════════════════════════════ */
const FRONT_END = [
  'index.html', 'admin.html',
  'styles.css', 'admin.css',
  'main.js', 'admin-panel.js',
  'logo.png', 'logo.jpg', 'KiAnben.png',
  'robots.txt', 'sitemap.xml'
];

FRONT_END.forEach(file => {
  app.get(`/${file}`, (req, res) => res.sendFile(path.join(__dirname, file)));
});

// Root → index.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

/* ══ API Routes ═════════════════════════════════════════════ */
app.use('/api/auth',          require('./route-auth'));
app.use('/api/members',       require('./route-members'));
app.use('/api/announcements', require('./route-announcements'));
app.use('/api/admin',         require('./route-admin'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));

// Any other route → index.html (SPA behaviour)
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ message: 'Server error.' }); });

app.listen(PORT, () => {
  console.log('');
  console.log('🚀  KiAnben is running!');
  console.log(`    Website:     http://localhost:${PORT}`);
  console.log(`    Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`    Health:      http://localhost:${PORT}/api/health`);
  console.log('');
});
module.exports = app;
