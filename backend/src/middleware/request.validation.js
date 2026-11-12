'use strict';

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.length <= max;
const optionalText = (value, max) => value === undefined || text(value, max);
const error = message => Object.assign(new Error(message), { status: 400 });
const validSkill = item =>
  (typeof item === 'string' && item.length <= 120) ||
  (plain(item) && [item.skill, item.name, item.canonicalName].some(v => text(v, 120)) &&
    optionalText(item.requirementType, 30));
const skillList = values => Array.isArray(values) && values.length <= 200 && values.every(validSkill);

function requireObject(body) {
  if (!plain(body)) throw error('A JSON object is required.');
  return body;
}
function validateJD(body) {
  requireObject(body);
  if (!text(body.description, 12000) || !body.description.trim()) throw error('Job description must contain 1–12000 characters.');
  if (!optionalText(body.title, 180) || !optionalText(body.company, 180)) throw error('Invalid job title or company.');
}
function validateJob(body) {
  requireObject(body);
  if (!optionalText(body.title, 180) || !optionalText(body.company, 180) ||
    (body.requiredSkills !== undefined && (!skillList(body.requiredSkills) || !body.requiredSkills.every(item => typeof item === 'string' || (text(item.skill,120) && ['required','preferred',undefined].includes(item.requirementType)))))) throw error('Invalid job profile or required skills.');
}
function validateSkills(body) {
  requireObject(body);
  if ((body.candidateSkills !== undefined && !skillList(body.candidateSkills)) ||
    (body.requiredSkills !== undefined && !skillList(body.requiredSkills))) throw error('Invalid skill list.');
}
function validateCandidate(body) {
  requireObject(body);
  const { candidateProfile, jobProfile } = body;
  if (!plain(candidateProfile) || !plain(jobProfile)) throw error('Candidate and job profiles are required.');
  if (candidateProfile.skills !== undefined && !skillList(candidateProfile.skills)) throw error('Invalid candidate skills.');
  for (const key of ['projects','experience','education','achievements','coursework','codingProfiles','positions','other','contact']) {
    if (candidateProfile[key] !== undefined && !text(candidateProfile[key], 40000)) throw error('Invalid candidate profile section.');
  }
  if (jobProfile.requiredSkills !== undefined && !skillList(jobProfile.requiredSkills)) throw error('Invalid job requirements.');
  if (!optionalText(jobProfile.title, 180) || !optionalText(jobProfile.description, 12000) ||
    !optionalText(jobProfile.roleId, 150) ||
    (jobProfile.assessment !== undefined && !plain(jobProfile.assessment))) throw error('Invalid job profile.');
}
function handle(handler) {
  return (req, res, next) => {
    try { return handler(req, res, next); }
    catch (err) { return next(err); }
  };
}
module.exports = { plain, text, optionalText, validSkill, skillList, error, requireObject, validateJD, validateJob, validateSkills, validateCandidate, handle };
