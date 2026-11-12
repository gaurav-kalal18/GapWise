'use strict';
const { PDFParse } = require('pdf-parse');
const { extractSkillsFromResume } = require('../services/resumeSkill.service');
const { extractResumeStructure } = require('../services/resume.service');
const { buildCandidateProfile } = require('../services/candidateProfile.service');

const isPDFBuffer = buffer => Buffer.isBuffer(buffer) && buffer.length >= 5 && buffer.subarray(0,5).toString('ascii') === '%PDF-';

async function parsePdf(buffer, PDFParser = PDFParse) {
  let parser;
  try {
    parser = new PDFParser({data:buffer});
    const result = await parser.getText();
    if (!result || typeof result.text !== 'string' || !result.text.trim()) {
      throw new Error('No readable PDF text.');
    }
    return result.text;
  } finally {
    if (parser) await parser.destroy();
  }
}

async function uploadResume(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({message:'No resume file uploaded.'});
    if (!isPDFBuffer(req.file.buffer)) return res.status(400).json({message:'Invalid PDF file content.'});
    let text;
    try { text = await parsePdf(req.file.buffer); }
    catch (error) {
      // Do not log or return parser errors which might include user-supplied content.
      console.warn('Resume PDF parsing failed.');
      return res.status(400).json({message:'Could not read this PDF. Try a text-based PDF.'});
    }
    const resume = extractResumeStructure(text);
    const skills = extractSkillsFromResume(resume.sections);
    const candidateProfile = buildCandidateProfile({...resume, skills});
    // Candidate profile is required for the analysis workflow. Avoid returning
    // duplicate full cleaned text and parsed sections in a separate resume object.
    return res.json({message:'Resume processed successfully', filename:req.file.originalname,
      resume:{skills}, candidateProfile});
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadResume, isPDFBuffer, parsePdf };
