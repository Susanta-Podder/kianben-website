'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('./db-init');
const mailer  = require('./mailer');
const ER = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/apply', async (req, res) => {
  try {
    const { fullName, email, phone, business, products, volume, service, referral, message } = req.body;
    if (!fullName?.trim() || !email?.trim() || !products?.trim() || !service?.trim())
      return res.status(400).json({ message:'Please fill all required fields.' });
    if (!ER.test(email.trim()))
      return res.status(400).json({ message:'Invalid email address.' });
    const dup = db.getApplications({ status:'pending' })
      .find(a => a.email.toLowerCase() === email.trim().toLowerCase());
    if (dup) return res.status(400).json({ message:'An application with this email is already pending.' });
    const app = db.insertApplication({
      fullName:fullName.trim(), email:email.trim().toLowerCase(),
      phone:phone?.trim()||'', business:business?.trim()||'',
      products:products.trim(), volume:volume?.trim()||'',
      service:service.trim(), referral:referral?.trim()||'',
      message:message?.trim()||''
    });
    mailer.sendApplicationNotification(app)
      .catch(e => console.error('[mailer application]', e.message));
    res.status(201).json({ success:true, message:'Application submitted.' });
  } catch(e) { console.error('[members/apply]', e); res.status(500).json({ message:'Server error.' }); }
});

module.exports = router;
