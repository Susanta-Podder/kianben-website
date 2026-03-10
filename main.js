/* ============================================================
   KiAnben — Main Frontend JS  v3
   Features:
   · 7-day persistent login — no re-login needed for 7 days
   · Silent server-side token verification on page load
   · Member profile editing with social media links
   · Announcement feed, join form, announcement request
   ============================================================ */
'use strict';

const API = '/api';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHero();
  initAnimations();
  initModals();
  initForms();
  loadAnnouncements();
  restoreSession();   // ← runs silently every page load
});

/* ════════════════════════════════════════════════════════
   7-DAY PERSISTENT SESSION
   ════════════════════════════════════════════════════════ */

/**
 * Called on every page load.
 * 1. Instantly restores nav from localStorage (no flicker).
 * 2. Verifies token with server in background.
 * 3. If server says invalid → clears session silently.
 * Token is valid for 7 days — user never needs to re-login.
 */
async function restoreSession() {
  const token  = localStorage.getItem('kb_token');
  const raw    = localStorage.getItem('kb_user');
  const expiry = parseInt(localStorage.getItem('kb_expiry') || '0', 10);

  // Nothing stored
  if (!token || !raw) { setNavState(null); return; }

  // Client-side expiry (7 days)
  if (Date.now() > expiry) { clearSession(); setNavState(null); return; }

  // Instantly restore from cache
  try {
    const user = JSON.parse(raw);
    setNavState(user);
    fillProfileForm(user);
  } catch { clearSession(); setNavState(null); return; }

  // Background server verify — updates cached profile with latest data
  try {
    const res  = await fetch(`${API}/auth/verify`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok && data.valid) {
      saveSession(token, data.user, expiry);
      setNavState(data.user);
      fillProfileForm(data.user);
    } else {
      clearSession(); setNavState(null);
    }
  } catch { /* network error — keep cached session (offline-friendly) */ }
}

function saveSession(token, user, expiry) {
  localStorage.setItem('kb_token',  token);
  localStorage.setItem('kb_user',   JSON.stringify(user));
  localStorage.setItem('kb_expiry', String(expiry || Date.now() + 7 * 24 * 60 * 60 * 1000));
}

function clearSession() {
  ['kb_token', 'kb_user', 'kb_expiry'].forEach(k => localStorage.removeItem(k));
}

function getToken() { return localStorage.getItem('kb_token'); }

/* ════════════════════════════════════════════════════════
   NAV STATE
   ════════════════════════════════════════════════════════ */
function setNavState(user) {
  const old = document.getElementById('openSignin');
  if (!old) return;
  const btn = old.cloneNode(false); // clone wipes old event listeners

  if (user) {
    const first = (user.fullName || 'Member').split(' ')[0];
    btn.innerHTML       = `<i class="fas fa-user-circle"></i> ${esc(first)}`;
    btn.style.color       = 'var(--blue)';
    btn.style.borderColor = 'rgba(41,171,226,.4)';
    btn.addEventListener('click', () => {
      // Set dashboard name + email
      const n = document.getElementById('dashName');
      const e = document.getElementById('dashEmail');
      if (n) n.textContent = `Welcome, ${esc(user.fullName || '')}!`;
      if (e) e.textContent = user.email || '';
      // Set avatar initial letter
      const av = document.getElementById('dashAvatar');
      if (av) av.innerHTML = `<span style="font-family:'Oswald',sans-serif;font-size:1.4rem;font-weight:700;color:var(--blue)">${(user.fullName||'M')[0].toUpperCase()}</span>`;
      openModal('dashboardModal');
    });
  } else {
    btn.innerHTML = '<i class="fas fa-user"></i> Sign In';
    btn.style.color = btn.style.borderColor = '';
    btn.addEventListener('click', () => openModal('signinModal'));
  }
  old.replaceWith(btn);
}

/* ════════════════════════════════════════════════════════
   NAVBAR
   ════════════════════════════════════════════════════════ */
function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
    updateActiveLink();
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    const s    = hamburger.querySelectorAll('span');
    s[0].style.transform = open ? 'rotate(45deg) translate(5px,5px)'   : '';
    s[1].style.opacity   = open ? '0' : '1';
    s[2].style.transform = open ? 'rotate(-45deg) translate(5px,-5px)' : '';
  });

  document.querySelectorAll('.nav-link').forEach(l =>
    l.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    })
  );
}

function updateActiveLink() {
  const y = window.scrollY + 100;
  document.querySelectorAll('section[id]').forEach(sec => {
    const a = document.querySelector(`.nav-link[href="#${sec.id}"]`);
    if (a) a.classList.toggle('active', y >= sec.offsetTop && y < sec.offsetTop + sec.offsetHeight);
  });
}

/* ════════════════════════════════════════════════════════
   HERO — Floating particles + animated counters
   ════════════════════════════════════════════════════════ */
function initHero() {
  const c = document.getElementById('floatingDots');
  if (!c) return;

  const s = document.createElement('style');
  s.textContent = `@keyframes fd{0%,100%{transform:translateY(0) translateX(0);opacity:.2}45%{transform:translateY(-26px) translateX(12px);opacity:.65}75%{transform:translateY(10px) translateX(-8px);opacity:.3}}`;
  document.head.appendChild(s);

  for (let i = 0; i < 30; i++) {
    const d = document.createElement('div');
    const z = (Math.random() * 3 + 1).toFixed(1);
    Object.assign(d.style, {
      position:'absolute', borderRadius:'50%', pointerEvents:'none',
      width:`${z}px`, height:`${z}px`,
      background:`rgba(41,171,226,${(Math.random()*.45+.08).toFixed(2)})`,
      left:`${(Math.random()*100).toFixed(1)}%`, top:`${(Math.random()*100).toFixed(1)}%`,
      animation:`fd ${(Math.random()*9+6).toFixed(1)}s ease-in-out infinite`,
      animationDelay:`${(Math.random()*6).toFixed(1)}s`
    });
    c.appendChild(d);
  }

  const obs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); } }),
    { threshold: .5 }
  );
  document.querySelectorAll('.stat-num').forEach(el => obs.observe(el));
}

function animateCount(el) {
  const target = parseInt(el.dataset.target, 10) || 0;
  const step   = target / (1800 / 16);
  let   cur    = 0;
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = Math.floor(cur).toLocaleString();
    if (cur >= target) clearInterval(t);
  }, 16);
}

/* ════════════════════════════════════════════════════════
   SCROLL ANIMATIONS
   ════════════════════════════════════════════════════════ */
function initAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add('visible'), i * 80); obs.unobserve(e.target); }
    });
  }, { threshold: .1 });

  document.querySelectorAll('.service-card,.price-card,.why-card,.step,.pillar,.ann-item').forEach(el => {
    el.classList.add('reveal'); obs.observe(el);
  });
}

/* ════════════════════════════════════════════════════════
   MODALS
   ════════════════════════════════════════════════════════ */
function initModals() {
  // Close buttons
  document.getElementById('closeSignin')?.addEventListener('click',            () => closeModal('signinModal'));
  document.getElementById('closeAnnouncementModal')?.addEventListener('click', () => closeModal('announcementModal'));
  document.getElementById('closeDashboard')?.addEventListener('click',         () => closeModal('dashboardModal'));

  // Open Quote modal
  document.getElementById('openQuoteModal')?.addEventListener('click', () => openModal('quoteModal'));

  // Sign out
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    clearSession(); closeModal('dashboardModal'); setNavState(null);
    showToast('You have been signed out.', 'success');
  });

  // Go to join section from sign-in modal
  document.getElementById('goToJoin')?.addEventListener('click', e => {
    e.preventDefault(); closeModal('signinModal');
    document.getElementById('join')?.scrollIntoView({ behavior:'smooth' });
  });

  // Dashboard → announcements section
  document.getElementById('dashViewAnnounce')?.addEventListener('click', () => {
    closeModal('dashboardModal');
    document.getElementById('announcements')?.scrollIntoView({ behavior:'smooth' });
  });

  // Dashboard → profile modal
  document.getElementById('openProfileEdit')?.addEventListener('click', () => {
    closeModal('dashboardModal'); openModal('profileModal');
  });

  // Click outside overlay to close
  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); })
  );

  // Escape key closes
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
  });
}

function openModal(id)  { const el = document.getElementById(id); if (el) { el.classList.add('active');    document.body.style.overflow = 'hidden'; } }
function closeModal(id) { const el = document.getElementById(id); if (el) { el.classList.remove('active'); document.body.style.overflow = ''; } }
window.closeModal = closeModal; // expose for inline onclick

/* ════════════════════════════════════════════════════════
   FORMS
   ════════════════════════════════════════════════════════ */
function initForms() {
  initSignInForm();
  initJoinForm();
  initAnnouncementForm();
  initProfileForm();
  initQuoteForm();
}

/* ── Sign In ── */
function initSignInForm() {
  const form = document.getElementById('signinForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('signinError');
    errEl.classList.add('hidden');
    const btn = form.querySelector('button[type="submit"]');
    setBtn(btn, true, '<i class="fas fa-circle-notch fa-spin"></i> Signing in…');

    try {
      const res  = await fetch(`${API}/auth/login`, post(Object.fromEntries(new FormData(e.target))));
      const data = await res.json();

      if (res.ok) {
        // Save session for 7 days
        saveSession(data.token, data.user);
        closeModal('signinModal');
        form.reset();
        setNavState(data.user);
        fillProfileForm(data.user);
        showToast(`Welcome back, ${data.user.fullName.split(' ')[0]}! 👋`, 'success');
      } else {
        errEl.textContent = data.message || 'Invalid email or password.';
        errEl.classList.remove('hidden');
        setBtn(btn, false, 'Sign In <i class="fas fa-sign-in-alt"></i>');
      }
    } catch {
      errEl.textContent = 'Network error. Check your connection.';
      errEl.classList.remove('hidden');
      setBtn(btn, false, 'Sign In <i class="fas fa-sign-in-alt"></i>');
    }
  });
}

/* ── Join / Apply Form ── */
function initJoinForm() {
  const form = document.getElementById('joinForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('joinSubmitBtn');
    setBtn(btn, true, '<i class="fas fa-circle-notch fa-spin"></i> Submitting…');

    try {
      const res  = await fetch(`${API}/members/apply`, post(Object.fromEntries(new FormData(e.target))));
      const data = await res.json();

      if (res.ok) {
        form.classList.add('hidden');
        document.getElementById('joinSuccess').classList.remove('hidden');
        showToast("Application submitted! We'll review within 24 hours.", 'success');
      } else {
        showToast(data.message || 'Something went wrong. Please try again.', 'error');
        setBtn(btn, false, '<span>Submit Application</span> <i class="fas fa-paper-plane"></i>');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
      setBtn(btn, false, '<span>Submit Application</span> <i class="fas fa-paper-plane"></i>');
    }
  });
}

/* ── Announcement Request ── */
function initAnnouncementForm() {
  const form = document.getElementById('announcementForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('aReqError');
    errEl.classList.add('hidden');
    const btn = form.querySelector('button[type="submit"]');
    setBtn(btn, true, '<i class="fas fa-circle-notch fa-spin"></i> Submitting…');

    try {
      const res  = await fetch(`${API}/announcements/request`, post(Object.fromEntries(new FormData(e.target))));
      const data = await res.json();

      if (res.ok) {
        form.classList.add('hidden');
        document.getElementById('aReqSuccess').classList.remove('hidden');
        showToast('Request submitted for admin review!', 'success');
      } else {
        errEl.textContent = data.message || 'Please try again.';
        errEl.classList.remove('hidden');
        setBtn(btn, false, 'Submit for Review <i class="fas fa-paper-plane"></i>');
      }
    } catch {
      errEl.textContent = 'Network error.';
      errEl.classList.remove('hidden');
      setBtn(btn, false, 'Submit for Review <i class="fas fa-paper-plane"></i>');
    }
  });
}

/* ── Profile Edit (social links + bio) ── */
function initProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('profileError');
    errEl.classList.add('hidden');
    const token = getToken();
    if (!token) { closeModal('profileModal'); openModal('signinModal'); return; }

    const btn = form.querySelector('button[type="submit"]');
    setBtn(btn, true, '<i class="fas fa-circle-notch fa-spin"></i> Saving…');

    try {
      const payload = Object.fromEntries(new FormData(e.target));
      const res     = await fetch(`${API}/auth/profile`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        // Update cached session with fresh profile
        saveSession(token, data.user, parseInt(localStorage.getItem('kb_expiry') || '0', 10));
        const saved = document.getElementById('profileSaved');
        if (saved) { saved.classList.remove('hidden'); setTimeout(() => saved.classList.add('hidden'), 3000); }
        showToast('Profile updated!', 'success');
      } else {
        errEl.textContent = data.message || 'Failed to save. Please try again.';
        errEl.classList.remove('hidden');
      }
    } catch {
      errEl.textContent = 'Network error.';
      errEl.classList.remove('hidden');
    }

    setBtn(btn, false, 'Save Profile &nbsp;<i class="fas fa-save"></i>');
  });
}

/* Pre-fill profile form with stored values */
function fillProfileForm(user) {
  if (!user) return;
  const f = document.getElementById('profileForm');
  if (!f) return;
  ['phone','business','bio','facebook','whatsapp','youtube','instagram','linkedin'].forEach(k => {
    const el = f.elements[k];
    if (el && user[k]) el.value = user[k];
  });
}

/* ════════════════════════════════════════════════════════
   ANNOUNCEMENTS FEED
   ════════════════════════════════════════════════════════ */
async function loadAnnouncements() {
  const feed = document.getElementById('announcementFeed');
  if (!feed) return;

  try {
    const res  = await fetch(`${API}/announcements/published`);
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (data.announcements?.length) {
      feed.innerHTML = data.announcements.map(annCard).join('');
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e, i) => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('visible'), i * 60); obs.unobserve(e.target); } });
      }, { threshold: .1 });
      feed.querySelectorAll('.ann-item.reveal').forEach(el => obs.observe(el));
    } else {
      feed.innerHTML = `<div class="no-ann"><i class="fas fa-bullhorn"></i><p>No announcements yet. Be the first to submit one!</p></div>`;
    }
  } catch {
    feed.innerHTML = `<div class="no-ann"><i class="fas fa-exclamation-circle"></i><p>Could not load announcements. Please refresh.</p></div>`;
  }
}

function annCard(a) {
  const d = new Date(a.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  return `<div class="ann-item reveal">
    <div class="ann-item-head"><span class="ann-badge-label">KiAnben Community</span><span class="ann-date">${d}</span></div>
    <div class="ann-title">${esc(a.title)}</div>
    <div class="ann-text">${esc(a.content)}</div>
    <div class="ann-author"><i class="fas fa-user-circle"></i> ${esc(a.author)}</div>
  </div>`;
}

/* ── Get a Quote Form ── */
function initQuoteForm() {
  const form = document.getElementById('quoteForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('quoteError');
    errEl.classList.add('hidden');
    const btn = document.getElementById('quoteSubmitBtn');
    setBtn(btn, true, '<i class="fas fa-circle-notch fa-spin"></i> &nbsp;Sending…');

    try {
      const res  = await fetch(`${API}/announcements/quote`, post(Object.fromEntries(new FormData(e.target))));
      const data = await res.json();

      if (res.ok) {
        form.classList.add('hidden');
        document.getElementById('quoteSuccess').classList.remove('hidden');
        showToast('Quote request sent! Check your email. 📧', 'success');
      } else {
        errEl.textContent = data.message || 'Something went wrong. Please try again.';
        errEl.classList.remove('hidden');
        setBtn(btn, false, '<i class="fas fa-paper-plane"></i> &nbsp;Send Quote Request');
      }
    } catch {
      errEl.textContent = 'Network error. Check your connection and try again.';
      errEl.classList.remove('hidden');
      setBtn(btn, false, '<i class="fas fa-paper-plane"></i> &nbsp;Send Quote Request');
    }
  });
}

/* ════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════ */
function post(body) {
  return { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) };
}
function setBtn(b, d, h) { if (!b) return; b.disabled = d; b.innerHTML = h; }
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.className = `toast ${type} show`;
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 4500);
}
function togglePassword(id) {
  const inp = document.getElementById(id); if (!inp) return;
  inp.type  = inp.type === 'password' ? 'text' : 'password';
  const ic  = inp.closest('.pw-wrap')?.querySelector('.pw-toggle i');
  if (ic) ic.className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}
