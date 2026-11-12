'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {analyzeJD,buildJobProfile,parse}=require('../src/services/jd.assessment.service');
const {analyzeRubric}=require('../src/services/role.rubric.analysis.service');
const {VERSION:roleVersion}=require('../src/services/role.rubric.service');
const evaluate=(description,profile,skills=[])=>analyzeJD(profile,buildJobProfile({description}),skills.map(canonicalName=>({canonicalName})));
const status=(d,p,skills=[])=>[...evaluate(d,p,skills).matches,...evaluate(d,p,skills).gaps][0]?.evidenceStatus;

test('Java implementation is demonstrated without an explicit technology stack',()=>{
 assert.equal(status('Required: Java',{experience:'- Developed a Java application.'},['Java']),'demonstrated');
});
test('Java alternative is satisfied by a direct Java application claim',()=>{
 const result=evaluate('Required: Java or Python',{projects:'- Developed a Java application.'},['Java']);
 assert.equal(result.matches.length,1);
 assert.equal(result.matches[0].matchedWith,'Java');
 assert.equal(result.readiness.score,100);
});
test('Python stack cannot borrow an observational monitoring-tool implementation',()=>{
 const p={projects:'Keyword Demo | GitHub\nPython • React • Docker • Kubernetes\n- Built a tool to monitor React components.'};
 assert.equal(status('Required: Python',p,['Python']),'partial');
});
test('Explicit implementation in Python retains demonstrated status',()=>{
 assert.equal(status('Required: Python',{projects:'- Developed a Python script to process CSV files.'},['Python']),'demonstrated');
});
test('MongoDB collection creation supports role database implementation',()=>{
 const role='role:full-stack-developer';
 const p={projects:'Marketplace | GitHub\nJavaScript • Node.js • React • MongoDB\n- Created MongoDB collections for inventory.'};
 const result=analyzeRubric(p,{roleId:role,assessment:{id:role,version:roleVersion}},[{canonicalName:'MongoDB'}]);
 const row=[...result.matches,...result.gaps].find(r=>r.canonicalSkillId==='gapwise:competency:database');
 assert.equal(row.evidenceStatus,'demonstrated');
});
test('Benefits prose is ignored; genuine unknown requirements remain unresolved',()=>{
 const parsed=parse('About us:\nWe offer flexible working hours.\nRequired Skills:\nJava\nStrong understanding of distributed systems');
 assert.equal(parsed.requiredSkills.length,1);
 assert.equal(parsed.requiredSkills[0].skill,'Java');
 assert.equal(parsed.unresolvedRequirements.length,1);
 assert.match(parsed.unresolvedRequirements[0].excerpt,/distributed systems/);
});
test('Unresolved experience qualifications still withhold overall score',()=>{
 const r=evaluate('Required Skills:\nJava\n3 years of professional experience',{projects:'- Developed a Java application.'},['Java']);
 assert.equal(r.readiness.score,null);
 assert.equal(r.readiness.summary.requiredCoverage,100);
});
