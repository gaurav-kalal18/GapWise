'use strict';
const fs=require('node:fs');const path=require('node:path');
const fixtures=require('./cases.cjs');
const {buildJobProfile,analyzeJD,VERSION}=require('../src/services/jd.assessment.service');
const rubric=require('../src/services/role.rubric.service');
const {analyzeRubric}=require('../src/services/role.rubric.analysis.service');
const labels=['demonstrated','partial','not_demonstrated','unresolved','ignored','missing'];
const results=[];const scores=[];const errors=[];
for(const f of fixtures){
 const skills=f.skills.map(canonicalName=>({canonicalName}));const candidate={projects:f.projects||'',experience:f.experience||'',coursework:f.coursework||'',codingProfiles:f.codingProfiles||'',skills};
 const description=f.description||['Required Skills:',...Object.keys(f.jd),...(f.review||[])].join('\n');
 const record=(mode,requirement,expected,actual,evidence=[])=>results.push({case:f.id,mode,requirement,expected,actual,correct:expected===actual,evidence});
 try{
 const result=analyzeJD(candidate,buildJobProfile({description}),skills);
 const rows=[...result.matches,...result.gaps];
 for(const [name,expected] of Object.entries(f.jd)){const r=rows.find(x=>x.skill===name);record('jd',name,expected,r?.evidenceStatus||'missing',r?.candidateEvidence||[]);}
 for(const clause of f.review||[]){const r=result.unresolvedRequirements.find(x=>x.excerpt.includes(clause));record('jd',clause,'unresolved',r?'unresolved':'missing');}
 for(const clause of f.ignore||[]){const r=result.unresolvedRequirements.find(x=>x.excerpt.includes(clause));record('jd',clause,'ignored',r?'unresolved':'ignored');}
 const expectedScore=(f.review||[]).length?null:Math.round(100*Object.values(f.jd).filter(x=>x==='demonstrated').length/Object.keys(f.jd).length);
 scores.push({case:f.id,expected:expectedScore,actual:result.readiness.score,correct:expectedScore===result.readiness.score});
 const role=analyzeRubric(candidate,{roleId:f.role,assessment:{id:f.role,version:rubric.VERSION}},skills);
 for(const [key,expected] of Object.entries(f.competencies)){const r=[...role.matches,...role.gaps].find(x=>x.canonicalSkillId===`gapwise:competency:${key}`);record('role',key,expected,r?.evidenceStatus||'missing',r?.candidateEvidence||[]);}
 }catch(e){errors.push({case:f.id,error:e.stack});}
}
const matrix=Object.fromEntries(labels.map(a=>[a,Object.fromEntries(labels.map(b=>[b,0]))]));for(const r of results)matrix[r.expected][r.actual]++;
const metrics=rows=>{const tp=rows.filter(r=>r.expected==='demonstrated'&&r.actual==='demonstrated').length,fp=rows.filter(r=>r.expected!=='demonstrated'&&r.actual==='demonstrated').length,fn=rows.filter(r=>r.expected==='demonstrated'&&r.actual!=='demonstrated').length;return {total:rows.length,correct:rows.filter(r=>r.correct).length,tp,fp,fn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null};};
const report={dataset:'synthetic-development-v1',jdVersion:VERSION,roleVersion:rubric.VERSION,fixtures:fixtures.length,metrics:{all:metrics(results),jd:metrics(results.filter(r=>r.mode==='jd')),role:metrics(results.filter(r=>r.mode==='role'))},matrix,scores,errors,results};
const out=path.join(__dirname,'validation-report.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.metrics,null,2));console.table(results.filter(r=>!r.correct).map(({case:c,mode,requirement,expected,actual})=>({case:c,mode,requirement,expected,actual})));console.table(scores.filter(x=>!x.correct));console.log('Errors:',errors.length,'Report:',out);if(errors.length)process.exitCode=1;
