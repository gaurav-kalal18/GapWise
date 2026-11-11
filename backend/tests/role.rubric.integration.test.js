'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const analysisPath=path.resolve(__dirname,'../src/services/analysis.service.js');
function loadAnalysis(){
  const original=Module._load;
  Module._load=function(req,parent,isMain){
    if(parent?.filename===analysisPath){
      if(req==='./matching.service') return {matchSkills:(_c,reqs)=>({matches:[],gaps:reqs.map(r=>({skill:r.skill,requirementType:r.requirementType,matchType:'gap',matchScore:0,satisfiesRequirement:false}))})};
      if(req==='./priority.service') return {prioritizeGaps:gs=>gs};
      if(req==='./readiness.service') return {calculateReadiness:(matches,gaps)=>({score:Math.round(100*matches.length/(matches.length+gaps.length)),summary:{requiredMatches:matches.length,requiredGaps:gaps.length}})};
      if(req==='./dependency.service') return {prioritizeByDependencies:gs=>gs};
      if(req==='./roadmap.service') return {generateRoadmap:()=>[{skill:'legacy marker'}]};
      if(req==='./skill.identity.service') return {resolveCandidateSkills:cs=>cs};
    }
    return original.apply(this,arguments);
  };
  try {delete require.cache[analysisPath]; return require(analysisPath);} finally {Module._load=original;}
}
const { analyzeResolvedCandidate }=loadAnalysis();
const requirements=['debug software','use software design patterns','analyse software specifications','develop software prototype','use software libraries'].map(skill=>({skill,requirementType:'required'}));
const profile={projects:'Implemented Atomic Update strategy using the Strategy Pattern.\nCreated reusable React components and modular Express services.\nBuilt a backend testing framework to reproduce and validate race conditions.'};
const assessed={roleId:'role:software-engineer',requiredSkills:requirements,assessment:{id:'software-engineer-foundations',type:'curated-resume-evidence-coverage',scope:'Foundational evidence'}};

const {VERSION}=require('../src/services/role.rubric.service');
test('new role profile uses shared rubric engine, not old matcher or roadmap',()=>{
 const roleId='role:backend-developer';
 const result=analyzeResolvedCandidate([], {roleId,assessment:{id:roleId,type:'gapwise-role-rubric',version:VERSION},requiredSkills:[]}, {projects:'Implemented REST APIs in Python.\nConfigured a PostgreSQL database.'});
 assert.equal(result.readiness.summary.totalRequirements,11);
 assert.ok(result.matches.some(m=>m.canonicalSkillId==='gapwise:competency:api'));
 assert.equal(result.readiness.metric,'required_resume_evidence_coverage');
 assert.ok(result.roadmap.every(x=>x.estimatedWeeks===null));
});
test('custom JD still uses existing path',()=>{
 const result=analyzeResolvedCandidate([],{requiredSkills:requirements},profile);
 assert.equal(result.roadmap[0].skill,'legacy marker');
 assert.equal(result.assessmentVersion,undefined);
});
