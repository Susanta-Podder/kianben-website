/* ============================================
   KIANBEN — ADMIN PANEL JAVASCRIPT
   Full: Applications, Orders, Announcements,
   Pricing Editor, Members, Publish
   ============================================ */
const API = '/api';
let adminToken = localStorage.getItem('kianben_admin_token');

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('adminDate').textContent = new Date().toLocaleDateString('en-US',
    { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  if (adminToken) { showDashboard(); }
  else { show('adminLogin'); hide('adminDashboard'); }

  initLogin();
  initSidebar();
  initFilterButtons();
  initPublishForm();
  initNewOrderForm();
  initPricingForm();
});

/* ── LOGIN ── */
function initLogin() {
  document.getElementById('adminLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('adminLoginError');
    errEl.classList.add('hidden');
    const btn = e.target.querySelector('button[type="submit"]');
    setBtn(btn, true, '<i class="fas fa-circle-notch fa-spin"></i> Signing in…');
    try {
      const res = await fetch(`${API}/auth/admin-login`, post({ username: document.getElementById('adminUser').value.trim(), password: document.getElementById('adminPass').value }));
      const d   = await res.json();
      if (res.ok) { adminToken = d.token; localStorage.setItem('kianben_admin_token', adminToken); showDashboard(); }
      else { errEl.textContent = d.message || 'Invalid credentials.'; errEl.classList.remove('hidden'); setBtn(btn, false, 'Sign In <i class="fas fa-sign-in-alt"></i>'); }
    } catch { errEl.textContent = 'Network error.'; errEl.classList.remove('hidden'); setBtn(btn, false, 'Sign In <i class="fas fa-sign-in-alt"></i>'); }
  });
}

function showDashboard() {
  hide('adminLogin'); show('adminDashboard');
  loadOverview(); loadPendingCounts();
}

/* ── SIDEBAR ── */
function initSidebar() {
  document.querySelectorAll('.sidebar-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.getElementById('adminLogout').addEventListener('click', () => {
    localStorage.removeItem('kianben_admin_token'); adminToken = null;
    hide('adminDashboard'); show('adminLogin');
    document.getElementById('adminLoginForm').reset();
    document.getElementById('adminLoginError').classList.add('hidden');
    showToast('Signed out.', 'success');
  });
}

function switchTab(tab) {
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  const titles = { overview:'Overview', applications:'Applications', orders:'Order Requests', announcements:'Announcements', pricing:'Membership Pricing', members:'Members', publish:'New Announcement' };
  document.getElementById('pageTitle').textContent = titles[tab] || tab;
  if (tab === 'applications')  loadApplications('pending');
  if (tab === 'orders')        loadOrders('pending');
  if (tab === 'announcements') loadAnnouncements('pending');
  if (tab === 'pricing')       loadPricing();
  if (tab === 'members')       loadMembers();
}

/* globally accessible */
window.switchTab = switchTab;

/* ── FILTER BUTTONS ── */
function initFilterButtons() {
  document.querySelectorAll('#appFilters .filter-btn').forEach(b   => b.addEventListener('click', () => loadApplications(b.dataset.filter)));
  document.querySelectorAll('#orderFilters .filter-btn').forEach(b  => b.addEventListener('click', () => loadOrders(b.dataset.filter)));
  document.querySelectorAll('#annFilters .filter-btn').forEach(b    => b.addEventListener('click', () => loadAnnouncements(b.dataset.filter)));
}

function setFilterActive(scope, value) {
  document.querySelectorAll(`${scope} .filter-btn`).forEach(b => b.classList.toggle('active', b.dataset.filter === value));
}

/* ── ADMIN FETCH ── */
async function af(url, opts = {}) {
  if (!adminToken) { expireSession(); return null; }
  const res = await fetch(`${API}${url}`, { ...opts, headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${adminToken}`, ...(opts.headers||{}) } });
  if (res.status === 401) { expireSession(); return null; }
  return res;
}
function expireSession() {
  localStorage.removeItem('kianben_admin_token'); adminToken = null;
  hide('adminDashboard'); show('adminLogin');
  showToast('Session expired. Please sign in again.', 'error');
}

/* ── OVERVIEW ── */
async function loadOverview() {
  try {
    const res = await af('/admin/stats');
    if (!res) return;
    const d = await res.json();
    setText('stat-members',       d.totalMembers           ?? 0);
    setText('stat-applications',  d.pendingApplications    ?? 0);
    setText('stat-orders',        d.pendingOrders          ?? 0);
    setText('stat-announcements', d.publishedAnnouncements ?? 0);
    renderMiniTable('recentApps',   d.recentApplications  || [], ['fullName','email','service','status','created_at']);
    renderMiniTable('recentOrders', d.recentOrders        || [], ['memberName','product','origin','status','created_at']);
  } catch { setText('stat-members','—'); }
}

function renderMiniTable(containerId, rows, cols) {
  const el = document.getElementById(containerId);
  if (!rows.length) { el.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>Nothing here yet.</p></div>`; return; }
  const headMap = { fullName:'Name', memberName:'Member', email:'Email', service:'Service', product:'Product', origin:'Origin', status:'Status', created_at:'Date' };
  el.innerHTML = `<table class="admin-table"><thead><tr>${cols.map(c=>`<th>${headMap[c]||c}</th>`).join('')}</tr></thead><tbody>
    ${rows.slice(0,6).map(r=>`<tr>${cols.map(c=>`<td>${c==='status'?`<span class="status-badge status-${r[c]}">${r[c]}</span>`:c==='created_at'?fmtDate(r[c]):esc(r[c]||'—')}</td>`).join('')}</tr>`).join('')}
  </tbody></table>`;
}

async function loadPendingCounts() {
  try {
    const res = await af('/admin/pending-counts');
    if (!res) return;
    const d = await res.json();
    const setB = (id,n) => { const el = document.getElementById(id); if(el){el.textContent=n; el.classList.toggle('visible',n>0);} };
    setB('pendingCount', d.pendingAnnouncements ?? 0);
    setB('pendingApps',  d.pendingApplications  ?? 0);
  } catch {}
}

/* ── APPLICATIONS ── */
async function loadApplications(filter) {
  setFilterActive('#appFilters', filter);
  const c = document.getElementById('applicationsList');
  c.innerHTML = loading();
  try {
    const res = await af(`/admin/applications?status=${filter}`);
    if (!res) return;
    const d = await res.json();
    if (!d.applications?.length) { c.innerHTML = empty('No applications found.'); return; }
    c.innerHTML = d.applications.map(a => `
      <div class="request-card">
        <div class="request-card-head">
          <div><div class="request-title">${esc(a.fullName)}</div>
            <div class="request-meta">
              <span><i class="fas fa-envelope"></i>${esc(a.email)}</span>
              <span><i class="fas fa-phone"></i>${esc(a.phone||'—')}</span>
              <span><i class="fas fa-cog"></i>${esc(a.service||'—')}</span>
              <span><i class="fas fa-calendar"></i>${fmtDate(a.created_at)}</span>
            </div>
          </div>
          <span class="status-badge status-${a.status}">${a.status}</span>
        </div>
        <div class="request-meta" style="margin-bottom:10px;gap:12px;flex-wrap:wrap">
          <span><i class="fas fa-box" style="color:var(--blue)"></i> ${esc(a.products||'—')}</span>
          <span><i class="fas fa-briefcase" style="color:var(--blue)"></i> ${esc(a.business||'—')}</span>
          ${a.volume?`<span><i class="fas fa-dollar-sign" style="color:var(--blue)"></i> ${esc(a.volume)}</span>`:''}
        </div>
        ${a.message?`<div class="request-body">${esc(a.message)}</div>`:''}
        <div class="request-actions">
          ${a.status==='pending'?`
            <button class="action-btn approve" onclick="reviewApp(${a.id},'approved')"><i class="fas fa-check"></i> Approve</button>
            <button class="action-btn reject"  onclick="reviewApp(${a.id},'rejected')"><i class="fas fa-times"></i> Reject</button>`:''}
          <button class="action-btn delete" onclick="deleteApp(${a.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>`).join('');
  } catch { c.innerHTML = empty('Failed to load.'); }
}

async function reviewApp(id, action) {
  try {
    const res = await af(`/admin/applications/${id}/review`, post({ action }));
    if (res?.ok) { showToast(`Application ${action}!`, 'success'); loadApplications(activeFilter('#appFilters')); loadPendingCounts(); loadOverview(); }
  } catch { showToast('Failed.', 'error'); }
}
async function deleteApp(id) {
  if (!confirm('Delete this application?')) return;
  try { const res = await af(`/admin/applications/${id}`, { method:'DELETE' }); if (res?.ok) { showToast('Deleted.', 'success'); loadApplications(activeFilter('#appFilters')); } }
  catch { showToast('Failed.', 'error'); }
}
window.reviewApp = reviewApp; window.deleteApp = deleteApp;

/* ── ORDERS ── */
async function loadOrders(filter) {
  setFilterActive('#orderFilters', filter);
  const c = document.getElementById('ordersList');
  c.innerHTML = loading();
  try {
    const res = await af(`/admin/orders?status=${filter}`);
    if (!res) return;
    const d = await res.json();
    if (!d.orders?.length) { c.innerHTML = empty('No order requests found.'); return; }
    c.innerHTML = d.orders.map(o => `
      <div class="request-card">
        <div class="request-card-head">
          <div><div class="request-title">${esc(o.product)}</div>
            <div class="request-meta">
              <span><i class="fas fa-user"></i>${esc(o.memberName)}</span>
              <span><i class="fas fa-envelope"></i>${esc(o.email)}</span>
              ${o.origin?`<span><i class="fas fa-globe"></i>${esc(o.origin)}</span>`:''}
              ${o.value?`<span><i class="fas fa-dollar-sign"></i>${esc(o.value)}</span>`:''}
              <span><i class="fas fa-calendar"></i>${fmtDate(o.created_at)}</span>
            </div>
          </div>
          <span class="status-badge status-${o.status}">${o.status.replace('_',' ')}</span>
        </div>
        ${o.notes?`<div class="request-body">${esc(o.notes)}</div>`:''}
        <div class="request-actions">
          ${o.status==='pending'?`<button class="action-btn progress" onclick="updateOrder(${o.id},'in_progress')"><i class="fas fa-spinner"></i> In Progress</button>`:''}
          ${o.status==='in_progress'?`<button class="action-btn complete" onclick="updateOrder(${o.id},'completed')"><i class="fas fa-check-double"></i> Complete</button>`:''}
          <button class="action-btn delete" onclick="deleteOrder(${o.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>`).join('');
  } catch { c.innerHTML = empty('Failed to load orders.'); }
}

async function updateOrder(id, status) {
  try {
    const res = await af(`/admin/orders/${id}/status`, post({ status }));
    if (res?.ok) { showToast('Order updated!', 'success'); loadOrders(activeFilter('#orderFilters')); loadOverview(); }
  } catch { showToast('Failed.', 'error'); }
}
async function deleteOrder(id) {
  if (!confirm('Delete this order?')) return;
  try { const res = await af(`/admin/orders/${id}`, { method:'DELETE' }); if (res?.ok) { showToast('Deleted.', 'success'); loadOrders(activeFilter('#orderFilters')); } }
  catch { showToast('Failed.', 'error'); }
}
window.updateOrder = updateOrder; window.deleteOrder = deleteOrder;

function openNewOrderModal() { openModal('newOrderModal'); }
window.openNewOrderModal = openNewOrderModal;

function initNewOrderForm() {
  const form = document.getElementById('newOrderForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('orderFormError'); errEl.classList.add('hidden');
    const btn = form.querySelector('button[type="submit"]');
    setBtn(btn, true, '<i class="fas fa-circle-notch fa-spin"></i> Saving…');
    try {
      const res = await af('/admin/orders', post(Object.fromEntries(new FormData(e.target))));
      const d   = await res?.json();
      if (res?.ok) { closeModal('newOrderModal'); form.reset(); showToast('Order saved!', 'success'); loadOrders('pending'); loadOverview(); }
      else { errEl.textContent = d?.message || 'Failed.'; errEl.classList.remove('hidden'); setBtn(btn, false, 'Save Order <i class="fas fa-save"></i>'); }
    } catch { errEl.textContent = 'Network error.'; errEl.classList.remove('hidden'); setBtn(btn, false, 'Save Order <i class="fas fa-save"></i>'); }
  });
}

/* ── ANNOUNCEMENTS ── */
async function loadAnnouncements(filter) {
  setFilterActive('#annFilters', filter);
  const c = document.getElementById('announcementRequests');
  c.innerHTML = loading();
  try {
    const res = await af(`/admin/announcement-requests?status=${filter}`);
    if (!res) return;
    const d = await res.json();
    if (!d.requests?.length) { c.innerHTML = empty('No requests found.'); return; }
    c.innerHTML = d.requests.map(r => `
      <div class="request-card">
        <div class="request-card-head">
          <div><div class="request-title">${esc(r.title)}</div>
            <div class="request-meta">
              <span><i class="fas fa-user"></i>${esc(r.author)}</span>
              <span><i class="fas fa-envelope"></i>${esc(r.email||'—')}</span>
              <span><i class="fas fa-calendar"></i>${fmtDate(r.created_at)}</span>
            </div>
          </div>
          <span class="status-badge status-${r.status==='approved'?'published':r.status}">${r.status}</span>
        </div>
        <div class="request-body">${esc(r.content)}</div>
        <div class="request-actions">
          ${r.status==='pending'?`
            <button class="action-btn approve" onclick="reviewAnn(${r.id},'approved')"><i class="fas fa-check"></i> Approve &amp; Publish</button>
            <button class="action-btn reject"  onclick="reviewAnn(${r.id},'rejected')"><i class="fas fa-times"></i> Reject</button>`:''}
          <button class="action-btn delete" onclick="deleteAnn(${r.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>`).join('');
  } catch { c.innerHTML = empty('Failed to load.'); }
}

async function reviewAnn(id, action) {
  try {
    const res = await af(`/admin/announcements/${id}/review`, post({ action }));
    if (res?.ok) { showToast(`Announcement ${action}!`, 'success'); loadAnnouncements(activeFilter('#annFilters')); loadPendingCounts(); }
  } catch { showToast('Failed.', 'error'); }
}
async function deleteAnn(id) {
  if (!confirm('Delete this announcement?')) return;
  try { const res = await af(`/admin/announcements/${id}`, { method:'DELETE' }); if (res?.ok) { showToast('Deleted.', 'success'); loadAnnouncements(activeFilter('#annFilters')); } }
  catch { showToast('Failed.', 'error'); }
}
window.reviewAnn = reviewAnn; window.deleteAnn = deleteAnn;

/* ── PRICING ── */
const DEFAULT_PLANS = [
  { id:1, name:'Starter',   price:0,    period:'free',  desc:'Perfect for beginners', features:['Community Access','1 Free Consultation','Import Guides & Resources','Facebook Group Access','~Shared Import Batches','~Priority Support'] },
  { id:2, name:'Community', price:2500, period:'/year', desc:'For active importers',  features:['Everything in Starter','Shared Import Batches','Only 1% Commission','Duty & Customs Help','WhatsApp Support','~Dedicated Account Manager'] },
  { id:3, name:'Business',  price:8000, period:'/year', desc:'Full A-Z for businesses',features:['Everything in Community','A-Z Import Management','LC & Payment Handling','Door-to-Door Delivery','Dedicated Account Manager','Priority Processing'] }
];

async function loadPricing() {
  const c = document.getElementById('pricingAdmin');
  c.innerHTML = loading();
  try {
    const res = await af('/admin/pricing');
    const plans = res?.ok ? (await res.json()).plans : DEFAULT_PLANS;
    renderPricingAdmin(plans);
  } catch { renderPricingAdmin(DEFAULT_PLANS); }
}

function renderPricingAdmin(plans) {
  const c = document.getElementById('pricingAdmin');
  c.innerHTML = plans.map(p => {
    const priceStr = p.price === 0 ? 'Free' : `৳${Number(p.price).toLocaleString()}${p.period}`;
    return `<div class="pricing-admin-card">
      <div class="plan-name">${esc(p.name)}</div>
      <div class="plan-price-display">${priceStr}</div>
      <ul class="plan-features-list">
        ${(p.features||[]).map(f => {
          const off = f.startsWith('~');
          const txt = off ? f.slice(1) : f;
          return `<li class="${off?'off':'on'}"><i class="fas fa-${off?'times':'check'}"></i>${esc(txt)}</li>`;
        }).join('')}
      </ul>
      <button class="edit-plan-btn" onclick="openPricingEdit(${JSON.stringify(p).replace(/"/g,'&quot;')})">
        <i class="fas fa-edit"></i> Edit Plan
      </button>
    </div>`;
  }).join('');
}

function openPricingEdit(plan) {
  document.getElementById('editPlanId').value    = plan.id;
  document.getElementById('editPlanName').textContent = `Editing: ${plan.name}`;
  document.getElementById('editName').value      = plan.name;
  document.getElementById('editPrice').value     = plan.price;
  document.getElementById('editPeriod').value    = plan.period;
  document.getElementById('editDesc').value      = plan.desc || '';
  document.getElementById('editFeatures').value  = (plan.features||[]).join('\n');
  openModal('pricingModal');
}
window.openPricingEdit = openPricingEdit;

function initPricingForm() {
  const form = document.getElementById('pricingForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('pricingFormError'); errEl.classList.add('hidden');
    const fd = Object.fromEntries(new FormData(e.target));
    const payload = {
      id: parseInt(fd.planId, 10),
      name: fd.name, price: parseInt(fd.price,10)||0,
      period: fd.period, desc: fd.desc,
      features: fd.features.split('\n').map(s=>s.trim()).filter(Boolean)
    };
    const btn = form.querySelector('button[type="submit"]');
    setBtn(btn, true, '<i class="fas fa-circle-notch fa-spin"></i> Saving…');
    try {
      const res = await af('/admin/pricing/update', post(payload));
      if (res?.ok) { closeModal('pricingModal'); showToast('Plan updated!', 'success'); loadPricing(); }
      else { const d = await res?.json(); errEl.textContent = d?.message||'Failed.'; errEl.classList.remove('hidden'); }
    } catch { errEl.textContent = 'Network error.'; errEl.classList.remove('hidden'); }
    setBtn(btn, false, 'Save Changes <i class="fas fa-save"></i>');
  });
}

/* ── MEMBERS ── */
async function loadMembers() {
  const c = document.getElementById('membersList');
  c.innerHTML = loading();
  try {
    const res = await af('/admin/members');
    if (!res) return;
    const d = await res.json();
    if (!d.members?.length) { c.innerHTML = empty('No members yet.'); return; }
    c.innerHTML = `<div style="overflow-x:auto"><table class="admin-table"><thead><tr>
      <th>Member</th><th>Contact</th><th>Business / Products</th>
      <th>Social Profiles</th><th>Last Login</th><th>Logins</th><th>Joined</th><th>Actions</th>
    </tr></thead><tbody>
      ${d.members.map(m=>`<tr>
        <td>
          <div style="font-weight:700;color:var(--text);">${esc(m.fullName)}</div>
          ${m.bio ? `<div style="font-size:.73rem;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(m.bio)}">${esc(m.bio)}</div>` : ''}
        </td>
        <td>
          <div>${esc(m.email)}</div>
          ${m.phone ? `<div style="font-size:.78rem;color:var(--muted);">${esc(m.phone)}</div>` : ''}
        </td>
        <td>
          <div>${esc(m.business||'—')}</div>
          ${m.products ? `<div style="font-size:.75rem;color:var(--muted);">${esc(m.products)}</div>` : ''}
        </td>
        <td>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;min-width:80px;">
            ${m.facebook   ? `<a href="${esc(m.facebook)}"            target="_blank" rel="noopener" title="Facebook"  style="color:#4267B2;font-size:1.2rem;"><i class="fab fa-facebook"></i></a>` : ''}
            ${m.whatsapp   ? `<a href="https://wa.me/${esc(m.whatsapp)}" target="_blank" rel="noopener" title="WhatsApp: ${esc(m.whatsapp)}" style="color:#25D366;font-size:1.2rem;"><i class="fab fa-whatsapp"></i></a>` : ''}
            ${m.youtube    ? `<a href="${esc(m.youtube)}"             target="_blank" rel="noopener" title="YouTube"   style="color:#FF0000;font-size:1.2rem;"><i class="fab fa-youtube"></i></a>` : ''}
            ${m.instagram  ? `<a href="${esc(m.instagram)}"           target="_blank" rel="noopener" title="Instagram" style="color:#C13584;font-size:1.2rem;"><i class="fab fa-instagram"></i></a>` : ''}
            ${m.linkedin   ? `<a href="${esc(m.linkedin)}"            target="_blank" rel="noopener" title="LinkedIn"  style="color:#0077B5;font-size:1.2rem;"><i class="fab fa-linkedin"></i></a>` : ''}
            ${!m.facebook&&!m.whatsapp&&!m.youtube&&!m.instagram&&!m.linkedin
              ? '<span style="color:var(--muted);font-size:.75rem;font-style:italic;">None added</span>' : ''}
          </div>
        </td>
        <td>${m.last_login ? fmtDate(m.last_login) : '<span style="color:var(--muted);font-size:.78rem;">Never</span>'}</td>
        <td style="text-align:center;font-weight:700;color:var(--blue);">${m.login_count||0}</td>
        <td>${fmtDate(m.created_at)}</td>
        <td><button class="action-btn delete" onclick="deleteMember(${m.id})"><i class="fas fa-trash"></i> Remove</button></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  } catch { c.innerHTML = empty('Failed to load.'); }
}

async function deleteMember(id) {
  if (!confirm('Remove this member?')) return;
  try { const res = await af(`/admin/members/${id}`, { method:'DELETE' }); if (res?.ok) { showToast('Member removed.', 'success'); loadMembers(); } }
  catch { showToast('Failed.', 'error'); }
}
window.deleteMember = deleteMember;

/* ── PUBLISH FORM ── */
function initPublishForm() {
  const form = document.getElementById('publishForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('publishError'); errEl.classList.add('hidden');
    const btn = form.querySelector('button[type="submit"]');
    setBtn(btn, true, '<i class="fas fa-circle-notch fa-spin"></i> Publishing…');
    try {
      const res = await af('/admin/announcements/publish', post(Object.fromEntries(new FormData(e.target))));
      const d   = await res?.json();
      if (res?.ok) { form.classList.add('hidden'); document.getElementById('publishSuccess').classList.remove('hidden'); showToast('Published!', 'success'); }
      else { errEl.textContent = d?.message||'Failed.'; errEl.classList.remove('hidden'); setBtn(btn, false, 'Publish Now <i class="fas fa-paper-plane"></i>'); }
    } catch { errEl.textContent = 'Network error.'; errEl.classList.remove('hidden'); setBtn(btn, false, 'Publish Now <i class="fas fa-paper-plane"></i>'); }
  });
}

function resetPublishForm() {
  const form = document.getElementById('publishForm');
  form?.reset(); form?.classList.remove('hidden');
  document.getElementById('publishSuccess').classList.add('hidden');
  document.getElementById('publishError').classList.add('hidden');
  setBtn(form?.querySelector('button[type="submit"]'), false, 'Publish Now <i class="fas fa-paper-plane"></i>');
}
window.resetPublishForm = resetPublishForm;

/* ── HELPERS ── */
function openModal(id)  { const el=document.getElementById(id); if(el){el.classList.add('active'); document.body.style.overflow='hidden';} }
function closeModal(id) { const el=document.getElementById(id); if(el){el.classList.remove('active'); document.body.style.overflow='';} }
window.closeModal = closeModal;

function post(body) { return { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }; }
function setBtn(b,d,h) { if(!b) return; b.disabled=d; b.innerHTML=h; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}) : '—'; }
function setText(id,v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function loading() { return '<div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Loading…</div>'; }
function empty(msg) { return `<div class="empty-state"><i class="fas fa-inbox"></i><p>${msg}</p></div>`; }
function show(id) { const el=document.getElementById(id); if(el) el.classList.remove('hidden'); }
function hide(id) { const el=document.getElementById(id); if(el) el.classList.add('hidden'); }
function activeFilter(scope) { return document.querySelector(`${scope} .filter-btn.active`)?.dataset.filter || 'pending'; }

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.className = `toast ${type} show`;
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 4000);
}
function togglePassword(id) {
  const inp = document.getElementById(id); if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  const icon = inp.closest('.pw-wrap')?.querySelector('.pw-toggle i');
  if (icon) icon.className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}
