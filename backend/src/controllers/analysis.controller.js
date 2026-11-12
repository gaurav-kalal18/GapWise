'use strict';
const { matchSkills } = require('../services/matching.service');
const { skillTaxonomy } = require('../services/skill.taxonomy');
const { prioritizeGaps } = require('../services/priority.service');
const { analyzeCandidateAgainstJob } = require('../services/analysis.service');
const { validateSkills, validateCandidate, handle } = require('../middleware/request.validation');

const analyzeSkills = handle((req,res) => {
  validateSkills(req.body);
  const {candidateSkills = [],requiredSkills = []} = req.body;
  const result = matchSkills(candidateSkills,requiredSkills);
  const prioritizedGaps = prioritizeGaps(result.gaps);
  return res.json({message:'Skill analysis completed',analysis:{matches:result.matches,gaps:prioritizedGaps}});
});

const analyzeCandidate = handle((req,res) => {
  validateCandidate(req.body);
  const {candidateProfile,jobProfile} = req.body;
  const analysis = analyzeCandidateAgainstJob(candidateProfile,jobProfile);
  return res.json({message:'Candidate-job analysis completed',analysis});
});

const getSkillTaxonomy = (req,res) => res.json(skillTaxonomy);
module.exports = {analyzeSkills,analyzeCandidate,getSkillTaxonomy};
