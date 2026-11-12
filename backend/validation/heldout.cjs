'use strict';
/**
 * GapWise Fix 08D — independently specified, frozen held-out checks.
 * This file deliberately does NOT edit application code or expected labels.
 * Run from any directory: node backend/validation/heldout.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const {buildJobProfile, analyzeJD, VERSION} = require('../src/services/jd.assessment.service');
const {analyzeRubric} = require('../src/services/role.rubric.analysis.service');
const rubric = require('../src/services/role.rubric.service');
const outPath = path.join(__dirname,'heldout-report.json');
const profile = ({projects='',experience='',skills=[],coursework='',codingProfiles=''}) => ({
  projects, experience, coursework, codingProfiles, education:'',achievements:'',positions:'',
  skills:skills.map(name=>({canonicalName:name,source:'technical-skills',confidence:1}))
});
// Expectations are human judgments about evidence in the synthetic resume,
// NOT reverse-engineered outputs of the matching engine.
// Each row is frozen. Preserve it when changing the evaluator.
const cases = [
 {id:'vue-student',mode:'jd',candidate:profile({
  projects:'EventHub GitHub — Live Demo\nVue • JavaScript • Vercel\n• Created reusable Vue components for an event registration interface.\n• Deployed the frontend on Vercel.',skills:['Vue','JavaScript']}),
  jd:'Required Skills:\n- Vue\n- JavaScript\n- React\nPreferred Skills:\n- Vercel',
  expected:{'Vue':'demonstrated','JavaScript':'demonstrated','React':'not_demonstrated','Vercel':'demonstrated'}},
 {id:'api-consumer-not-builder',mode:'jd',candidate:profile({
  projects:'Weather Cards GitHub — Live Demo\nJavaScript • REST APIs • React\n• Consumed REST APIs to display weather information.\n• Created reusable React components.'}),
  jd:'Required Skills:\n- REST API\n- React\n- PostgreSQL',
  expected:{'REST API':'demonstrated','React':'demonstrated','PostgreSQL':'not_demonstrated'}},
 {id:'sql-not-from-postgres',mode:'jd',candidate:profile({
  projects:'Catalog Backend GitHub — Live Demo\nNode.js • PostgreSQL\n• Provisioned a managed PostgreSQL database for the application.'}),
  jd:'Required Skills:\n- PostgreSQL\n- SQL',
  expected:{'PostgreSQL':'demonstrated','SQL':'not_demonstrated'}},
 {id:'only-declared-tools',mode:'jd',candidate:profile({skills:['Python','Docker','Pandas']}),
  jd:'Required Skills:\n- Python\n- Docker\n- Pandas',
  expected:{'Python':'partial','Docker':'partial','Pandas':'partial'}},
 {id:'negated-ml-claims',mode:'jd',candidate:profile({
  projects:'Analytics Prototype GitHub — Live Demo\nPython • PyTorch • Pandas\n• Planned to train a model using PyTorch.\n• Built a UI to monitor PyTorch model jobs.'}),
  jd:'Required Skills:\n- PyTorch\n- Pandas',
  expected:{'PyTorch':'partial','Pandas':'partial'}},
 {id:'transform-data-not-train-model',mode:'jd',candidate:profile({
  projects:'Data Cleaner GitHub — Live Demo\nPython • Pandas\n• Cleaned survey data using Pandas and removed invalid records.'}),
  jd:'Required Skills:\n- Pandas\n- PyTorch',
  expected:{'Pandas':'demonstrated','PyTorch':'not_demonstrated'}},
 {id:'tool-monitors-other-tool',mode:'jd',candidate:profile({
  projects:'Audit Reporter GitHub — Live Demo\nPython • React\n• Built a Python tool to monitor React application performance.'}),
  jd:'Required Skills:\n- React\n- Python',
  expected:{'React':'partial','Python':'demonstrated'}},
 {id:'multiple-jd-options',mode:'jd',candidate:profile({
  projects:'Inventory Service GitHub — Live Demo\nJava • MySQL\n• Built a backend application using Java.\n• Configured MySQL for persistence.'}),
  jd:'Required Skills:\n- Java or Python\n- MySQL\nPreferred Skills:\n- Docker',
  expected:{'Java or Python':'demonstrated','MySQL':'demonstrated','Docker':'not_demonstrated'}},
 {id:'missing-experience-qualifier',mode:'jd',candidate:profile({
  projects:'Login Backend GitHub — Live Demo\nJavaScript • Node.js\n• Built a backend service using Node.js.'}),
  jd:'Required Skills:\n- Node.js\n- 4 years of professional experience',
  expected:{'Node.js':'demonstrated'},unresolved:['4 years of professional experience'],score:null},
 {id:'no-benefit-as-requirement',mode:'jd',candidate:profile({
  projects:'Tiny Service GitHub — Live Demo\nJava • Docker\n• Built an application using Java.'}),
  jd:'Required Skills:\n- Java\nBenefits:\n- Paid time off\n- Flexible working hours',
  expected:{'Java':'demonstrated'},unresolved:[],score:100},
 {id:'cross-project-boundaries',mode:'jd',candidate:profile({
  projects:'One GitHub — Live Demo\nReact • JavaScript\n• Created React components for an event page.\nTwo GitHub — Live Demo\nPython • Django\n• Designed a document pipeline.'}),
  jd:'Required Skills:\n- React\n- Django',
  expected:{'React':'demonstrated','Django':'partial'}},
 {id:'git-ci-is-not-git-workflow',mode:'jd',candidate:profile({
  projects:'Delivery Bot GitHub — Live Demo\nGit • Docker\n• Deployed frontend with automated GitHub deployments.\n• Containerized database with Docker.'}),
  jd:'Required Skills:\n- Git\n- Docker',
  expected:{'Git':'partial','Docker':'demonstrated'}},
 {id:'frontend-role-no-unsupported-skills',mode:'role',roleId:'role:frontend-developer',candidate:profile({
  projects:'Portfolio GitHub — Live Demo\nReact • TypeScript\n• Created React components for the interface.',skills:['TypeScript','Git']}),
  expected:{ui:'demonstrated',version:'partial',accessibility:'not_demonstrated'}},
 {id:'data-science-role-negation',mode:'role',roleId:'role:data-scientist',candidate:profile({
  projects:'Data Notes GitHub — Live Demo\nPython • Pandas\n• Planned to train models and evaluate precision.\n• Built a dashboard to monitor machine learning jobs.',skills:['Python']}),
  expected:{modeling:'not_demonstrated',evaluation:'not_demonstrated'}},
 {id:'backend-role-database-work',mode:'role',roleId:'role:backend-developer',candidate:profile({
  projects:'Orders GitHub — Live Demo\nNode.js • MongoDB\n• Implemented MongoDB collections and indexes for an order service.'}),
  expected:{database:'demonstrated',security:'not_demonstrated'}},
];
function run(){
 const checks=[],scores=[],exceptions=[];
 for(const c of cases){
  try {
   const skills=c.candidate.skills; let result,recognized=[],unresolved=[];
   if(c.mode==='jd'){
    const job=buildJobProfile({title:'Validation scenario',description:c.jd});
    result=analyzeJD(c.candidate,job,skills);
    recognized=[...result.matches,...result.gaps].map(r=>r.skill);
    unresolved=result.unresolvedRequirements||[];
   } else {
    const assessment={id:c.roleId,type:'gapwise-role-rubric',version:rubric.VERSION};
    result=analyzeRubric(c.candidate,{roleId:c.roleId,assessment},skills);
   }
   const rows=[...result.matches,...result.gaps];
   for(const [name,expected] of Object.entries(c.expected)){
    const row=c.mode==='jd'?rows.find(r=>r.skill===name):rows.find(r=>r.canonicalSkillId===`gapwise:competency:${name}`);
    checks.push({case:c.id,mode:c.mode,requirement:name,expected,actual:row?.evidenceStatus||'missing',correct:row?.evidenceStatus===expected,evidence:row?.evidenceDetails?.slice(0,1).map(e=>e.excerpt)||[]});
   }
   if(c.mode==='jd'){
    for(const name of recognized.filter(x=>!Object.hasOwn(c.expected,x)))checks.push({case:c.id,mode:c.mode,requirement:`Unexpected recognized: ${name}`,expected:'absent',actual:'recognized',correct:false});
    if(Object.hasOwn(c,'unresolved')){
     for(const substring of c.unresolved){const ok=unresolved.some(r=>r.excerpt.includes(substring));checks.push({case:c.id,mode:c.mode,requirement:`Unresolved: ${substring}`,expected:'unresolved',actual:ok?'unresolved':'missing',correct:ok});}
     for(const u of unresolved.filter(u=>!c.unresolved.some(s=>u.excerpt.includes(s))))checks.push({case:c.id,mode:c.mode,requirement:`Unexpected unresolved: ${u.excerpt}`,expected:'ignored',actual:'unresolved',correct:false});
    }
   }
   if(Object.hasOwn(c,'score'))scores.push({case:c.id,expected:c.score,actual:result.readiness.score,correct:result.readiness.score===c.score});
  } catch(err){exceptions.push({case:c.id,message:err.message,stack:err.stack?.split('\n').slice(0,3).join('\n')});}
 }
 const good=checks.filter(c=>c.correct).length;
 const tp=checks.filter(c=>c.expected==='demonstrated'&&c.actual==='demonstrated').length;
 const fp=checks.filter(c=>c.expected!=='demonstrated'&&c.actual==='demonstrated').length;
 const fn=checks.filter(c=>c.expected==='demonstrated'&&c.actual!=='demonstrated').length;
 const report={meta:{suite:'gapwise-heldout-08d-v1',engineVersion:VERSION,caseCount:cases.length,notes:'Human-defined synthetic labels, not verified real-world performance. Dataset should remain frozen.'},summary:{total:checks.length,correct:good,agreement:checks.length?good/checks.length:null,tp,fp,fn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null,exceptions:exceptions.length},mismatches:checks.filter(c=>!c.correct),scoreMismatches:scores.filter(s=>!s.correct),exceptions,checks,scores};
 fs.writeFileSync(outPath,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report.summary,null,2));
 console.log('\nClassification mismatches:');console.table(report.mismatches.map(({case:id,requirement,expected,actual})=>({case:id,requirement,expected,actual})));
 console.log('Score mismatches:');console.table(report.scoreMismatches);
 console.log(`Exceptions: ${exceptions.length}\nReport: ${outPath}`);
 // This is a BENCHMARK, not a unit test. Return 0 even for mismatches so the
 // user can examine the results without confusing disagreements with a crash.
 if(exceptions.length)process.exitCode=1;
}
run();
