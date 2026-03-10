'use strict';
const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'kianben.json');

const DEFAULTS = {
  members:       [],
  applications:  [],
  announcements: [],
  admins:        [],
  orders:        [],
  pricing:       [],
  _counters: { members:0, applications:0, announcements:0, admins:0, orders:0 }
};

function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed, _counters: { ...DEFAULTS._counters, ...(parsed._counters||{}) } };
    }
  } catch(e) {
    console.error('DB read error:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULTS));
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch(e) {
    console.error('DB write error:', e.message);
  }
}

let data = readDB();

const now  = () => new Date().toISOString();
const save = () => writeDB(data);
const nid  = (t) => { data._counters[t] = (data._counters[t]||0)+1; return data._counters[t]; };

const match = (obj, cond) => Object.entries(cond).every(([k,v]) =>
  typeof v==='string' && typeof obj[k]==='string'
    ? obj[k].toLowerCase()===v.toLowerCase()
    : obj[k]===v
);

const db = {
  getMembers:        (w={}) => data.members.filter(m => match(m,w)),
  getMember:         (w)    => data.members.find(m => match(m,w)) || null,
  insertMember:      (f)    => { const r={id:nid('members'),...f,created_at:now()}; data.members.push(r); save(); return r; },
  updateMember:      (id,f) => {
    const i = data.members.findIndex(m=>m.id===id);
    if (i>-1) { Object.assign(data.members[i],f); save(); return data.members[i]; }
    return null;
  },
  deleteMember:      (id)   => { data.members=data.members.filter(m=>m.id!==id); save(); },

  getApplications:   (w={}) => data.applications.filter(a=>match(a,w)),
  getApplication:    (w)    => data.applications.find(a=>match(a,w)) || null,
  insertApplication: (f)    => { const r={id:nid('applications'),...f,status:'pending',created_at:now()}; data.applications.push(r); save(); return r; },
  updateApplication: (id,f) => {
    const i=data.applications.findIndex(a=>a.id===id);
    if (i>-1) { Object.assign(data.applications[i],f); save(); return data.applications[i]; }
    return null;
  },
  deleteApplication: (id)   => { data.applications=data.applications.filter(a=>a.id!==id); save(); },

  getAnnouncements:   (w={}) => data.announcements.filter(a=>match(a,w)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  getAnnouncement:    (w)    => data.announcements.find(a=>match(a,w)) || null,
  insertAnnouncement: (f)    => { const r={id:nid('announcements'),...f,created_at:now(),updated_at:now()}; data.announcements.push(r); save(); return r; },
  updateAnnouncement: (id,f) => {
    const i=data.announcements.findIndex(a=>a.id===id);
    if (i>-1) { Object.assign(data.announcements[i],f,{updated_at:now()}); save(); return data.announcements[i]; }
    return null;
  },
  deleteAnnouncement: (id)   => { data.announcements=data.announcements.filter(a=>a.id!==id); save(); },

  getAdmin:    (w) => data.admins.find(a=>match(a,w)) || null,
  insertAdmin: (f) => { const r={id:nid('admins'),...f,created_at:now()}; data.admins.push(r); save(); return r; },

  getOrders:   (w={}) => data.orders.filter(o=>match(o,w)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  getOrder:    (w)    => data.orders.find(o=>match(o,w)) || null,
  insertOrder: (f)    => { const r={id:nid('orders'),...f,status:'pending',created_at:now()}; data.orders.push(r); save(); return r; },
  updateOrder: (id,f) => {
    const i=data.orders.findIndex(o=>o.id===id);
    if (i>-1) { Object.assign(data.orders[i],f); save(); return data.orders[i]; }
    return null;
  },
  deleteOrder: (id)   => { data.orders=data.orders.filter(o=>o.id!==id); save(); },

  getPricing: ()      => data.pricing,
  setPricing: (plans) => { data.pricing=plans; save(); },

  count: (t,w={}) => (data[t]||[]).filter(r=>match(r,w)).length
};

/* Seed admin */
if (!db.getAdmin({ username:'admin' })) {
  db.insertAdmin({ username:'admin', password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD||'kianben@admin2025',10) });
  console.log('✅  Default admin created');
}

/* Seed announcements */
if (db.count('announcements',{status:'approved'})===0) {
  [
    { title:'Welcome to KiAnben Community!',
      content:'We are thrilled to launch our community platform. Stay updated on the latest import batches, sourcing opportunities, and trade insights. Together, we import smarter!' },
    { title:'New Shared Import Batch — Electronics from China',
      content:'Opening a new shared batch for consumer electronics from Shenzhen. Minimum order starts at $500. Join before the 15th. Contact us via Facebook or WhatsApp.' },
    { title:'Updated Customs Duty Rates 2025',
      content:'NBR has updated customs duty rates effective January 2025. Our team has reviewed all changes. Reach out for a free duty assessment on your products.' }
  ].forEach(s => db.insertAnnouncement({...s, author:'KiAnben Admin', status:'approved', submitted_by:'admin'}));
  console.log('✅  Sample announcements seeded');
}

/* Seed pricing */
if (!db.getPricing().length) {
  db.setPricing([
    { id:1, name:'Starter',   price:0,    period:'free',  desc:'For beginners exploring import',
      features:['Community Access','1 Free Consultation','Import Guides & Resources','Facebook Group Access','~Shared Import Batches','~Priority Support'] },
    { id:2, name:'Community', price:2500, period:'/year', desc:'For active importers',
      features:['Everything in Starter','Shared Import Batches','Only 1% Commission','Duty & Customs Help','WhatsApp Support','~Dedicated Account Manager'] },
    { id:3, name:'Business',  price:8000, period:'/year', desc:'Full A-Z for serious businesses',
      features:['Everything in Community','A-Z Import Management','LC & Payment Handling','Door-to-Door Delivery','Dedicated Account Manager','Priority Processing'] }
  ]);
  console.log('✅  Default pricing seeded');
}

module.exports = db;
