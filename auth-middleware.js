'use strict';
const jwt = require('jsonwebtoken');
const MS = process.env.JWT_SECRET       || 'kianben_member_secret_change_me';
const AS = process.env.ADMIN_JWT_SECRET || 'kianben_admin_secret_change_me';
const bear = req => { const a = req.headers.authorization||''; return a.startsWith('Bearer ') ? a.slice(7) : null; };
const verifyToken = (req,res,next) => { const t=bear(req); if(!t) return res.status(401).json({message:'Unauthorised'}); try{req.user=jwt.verify(t,MS);next();}catch{res.status(401).json({message:'Invalid token'});} };
const verifyAdmin = (req,res,next) => { const t=bear(req); if(!t) return res.status(401).json({message:'Unauthorised'}); try{const d=jwt.verify(t,AS); if(d.role!=='admin') return res.status(403).json({message:'Forbidden'}); req.admin=d; next();}catch{res.status(401).json({message:'Invalid admin token'});} };
module.exports = { verifyToken, verifyAdmin };
