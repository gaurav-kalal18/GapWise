'use strict';
const { normalizeSkill } = require('../services/skill.service');
const { buildJobProfile } = require('../services/job.service');
const { validateJD, validateJob, handle } = require('../middleware/request.validation');

const createJob = handle((req, res) => {
  validateJob(req.body);
  const {title, company, requiredSkills = []} = req.body;
  const normalizedSkills = requiredSkills.map(item => typeof item === 'string'
    ? {skill:normalizeSkill(item), requirementType:'required'}
    : {skill:normalizeSkill(item.skill), requirementType:item.requirementType || 'required'});
  return res.status(201).json({message:'Target job received successfully',job:{title, company,requiredSkills:normalizedSkills}});
});

const analyzeJobDescription = handle((req, res) => {
  validateJD(req.body);
  const {title = '', company = '', description} = req.body;
  const jobProfile = buildJobProfile({title,company,description});
  return res.json({message:'Job description analyzed successfully',jobProfile});
});

module.exports = {createJob,analyzeJobDescription};
