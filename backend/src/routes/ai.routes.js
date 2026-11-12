'use strict';
const express = require('express');
const { personalizeRoadmap, MAX_INPUT_BYTES } = require('../services/ai.roadmap.service');
const router = express.Router();
const hits = new Map();
const WINDOW = 60 * 60 * 1000;
const LIMIT = 3;
router.post('/ai/roadmap', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (process.env.AI_ROADMAP_ENABLED !== 'true') return res.status(503).json({message:'AI prototype is disabled. Original roadmap remains available.'});
  // Prototype-only in-memory limiter. Not distributed, not a replacement for auth.
  const now = Date.now(), key = req.ip || 'unknown';
  if (hits.size > 2000) for (const [ip, data] of hits) if (now - data.start >= WINDOW) hits.delete(ip);
  const record = hits.get(key);
  if (record && now - record.start < WINDOW && record.count >= LIMIT) return res.status(429).json({message:'AI request limit reached. Retry later.'});
  hits.set(key, record && now - record.start < WINDOW ? {start:record.start,count:record.count+1} : {start:now,count:1});
  try {
    if (Buffer.byteLength(JSON.stringify(req.body || {}),'utf8') > MAX_INPUT_BYTES) return res.status(413).json({message:'AI request too large.'});
    const output = await personalizeRoadmap(req.body);
    return res.json(output);
  } catch (err) {
    return res.status([400,413,503].includes(err.status) ? err.status : 503).json({message:err.status ? err.message : 'AI unavailable; the original roadmap is unchanged.'});
  }
});
module.exports = router;
