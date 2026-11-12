'use strict';
const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { uploadResume } = require('../controllers/resume.controller');

const router = express.Router();
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(), // No new resume file is written to disk.
  limits: { fileSize: MAX_PDF_BYTES, files: 1, fields: 0, parts: 1 },
  fileFilter(req, file, cb) {
    const isPDF = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
    if (!isPDF) return cb(Object.assign(new Error('Upload a PDF file only.'), {status:400}));
    cb(null, true);
  }
}).single('resume');

router.post('/resume', (req, res, next) => {
  upload(req, res, err => {
    if (err) return next(err);
    return uploadResume(req, res, next);
  });
});
module.exports = router;
