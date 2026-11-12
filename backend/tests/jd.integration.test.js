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
const {buildJobProfile}=require('../src/services/job.service');
test('custom JD profile dispatches into new evidence path',()=>{
 const result=analyzeResolvedCandidate([],buildJobProfile({description:'Required: Java'}),{projects:'Built an application using Java.'});
 assert.equal(result.assessmentVersion,'jd-evidence-v1.2');assert.equal(result.readiness.score,100);
});
