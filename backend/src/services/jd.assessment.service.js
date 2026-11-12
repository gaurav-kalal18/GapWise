'use strict';
const taxonomy = require('./technology.taxonomy');
const { C } = require('./role.rubric.service');
const { windows } = require('./resume.context.service');
const {assessTech,technologyGuidance}=require('./jd.technology.evidence.service');
const VERSION = 'jd-evidence-v1.2';
const norm = s => String(s ?? '').trim().toLowerCase().replace(/\s+/g,' ');
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const clean = s => s.trim().replace(/[.;]+$/,'').trim();
const entries = () => {
 const all = new Map();
 for (const t of taxonomy) {
  if (!t.id || !t.canonicalName) continue;
  for (const name of [t.canonicalName,...(t.aliases || [])]) {
   if (name.length < 2 || ['js','ts','node','render'].includes(norm(name))) continue;
   const k=norm(name); if(!all.has(k)) all.set(k,t); else if(all.get(k)?.id!==t.id) all.set(k,null);
  }
 }
 // Only exact competency labels, never broad inferred synonyms or tool equivalences.
 for(const [key,[label]] of Object.entries(C)) if(!all.has(norm(label))) all.set(norm(label),{id:`gapwise:competency:${key}`,canonicalName:label,competencyKey:key});
 return all;
};
const negative = /\b(?:not required|no experience (?:is )?required|not necessary|no need|not needed|optional only)\b/i;
const qualifier = /\b(?:\d+\+?\s*(?:years?|months?)|senior|expert|advanced|proficien(?:t|cy)|certifi(?:ed|cation)|degree|bachelor|master|phd|professional experience|commercial experience|production experience)\b/i;
const ignoreSections=new Set(['about us','benefits','what we offer']);
const headings = new Map(Object.entries({'required':'required','preferred':'preferred','requirements':'required','required qualifications':'required','minimum qualifications':'required','must have':'required','must-have':'required','required skills':'required','essential skills':'required','preferred qualifications':'preferred','preferred skills':'preferred','nice to have':'preferred','nice-to-have':'preferred','bonus skills':'preferred','desirable skills':'preferred','responsibilities':null,'about us':null,'about the role':null,'benefits':null,'what we offer':null,'job description':null}));
function parse(description){
 const dictionary=entries(), found=new Map(), review=[]; let section=null;
 for(const raw of String(description||'').split(/\r?\n/)) {
  let line=raw.trim().replace(/^(?:[-*•▪]\s+|\d+[.)]\s+)/,''); if(!line) continue;
  const head=norm(line.replace(/:$/,'')); if(headings.has(head)){section=ignoreSections.has(head)?'ignore':headings.get(head);continue;}
  let type=section;
  const explicit=line.match(/^(required|must have|must-have|preferred|nice to have|nice-to-have|bonus|optional)\s*:\s*/i);
  if(explicit){type=/^(required|must)/i.test(explicit[1])?'required':'preferred';line=line.slice(explicit[0].length);}
  if(section==='ignore'&&!explicit)continue;
  if(!type){review.push({excerpt:raw.trim(),reason:'requirement-importance-unclear'});continue;}
  if(negative.test(line)||qualifier.test(line)){review.push({excerpt:raw.trim(),requirementType:type,reason:negative.test(line)?'negated-requirement-needs-review':'qualified-requirement-needs-review'});continue;}
  // Only parse an entire simple list. Never silently strip an unknown qualifier or requirement.
  const body=clean(line.replace(/^(?:experience (?:with|in|using)|knowledge of|familiarity with|hands-on experience (?:with|in)|skills? in)\s+/i,''));
  const exact=dictionary.get(norm(body));
  const mixed=!exact&&/\bor\b/i.test(body)&&/\band\b|,/i.test(body);
  const alternatives=!exact&&/\s+or\s+/i.test(body);
  const chunks=exact?[body]:body.split(alternatives?/\s+or\s+/i:/\s+and\s+|\s*,\s*/i).map(clean);
  const items=chunks.map(s=>dictionary.get(norm(s)));
  if(mixed||!items.length||items.some(x=>!x)||alternatives&&items.some(x=>x.competencyKey)) {review.push({excerpt:raw.trim(),requirementType:type,reason:'unsupported-or-ambiguous-requirement'});continue;}
  const groups=alternatives?[items]:items.map(x=>[x]);
  for(const group of groups){
   const unique=[...new Map(group.map(t=>[t.id,t])).values()];
   const id=unique.map(t=>t.id).sort().join('|');
   const previous=found.get(id);if(previous){previous.jdEvidence.push(raw.trim());if(type==='required')previous.requirementType='required';continue;}
   found.set(id,{skill:unique.map(t=>t.canonicalName).join(' or '),canonicalSkillId:unique.length===1?unique[0].id:`jd:alternative:${id}`,requirementType:type,jdEvidence:[raw.trim()],options:unique.map(t=>({id:t.id,name:t.canonicalName,category:t.category,competencyKey:t.competencyKey})),...(unique.length>1?{anyOf:unique.map(t=>t.canonicalName)}:{})});
  }
 }
 // Overlap between separate OR and singleton requirements is logically ambiguous.
 const rows=[...found.values()];const overlap=new Set();
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(rows[i].options.some(a=>rows[j].options.some(b=>a.id===b.id))){overlap.add(rows[i]);overlap.add(rows[j]);}
 for(const row of overlap)review.push({excerpt:row.jdEvidence.join(' / '),requirementType:row.requirementType,reason:'overlapping-requirements-need-review'});
 return {requiredSkills:rows.filter(r=>!overlap.has(r)),unresolvedRequirements:review};
}
function buildJobProfile({title='',company='',description=''}){
 if(typeof description!=='string')throw new TypeError('Job description must be text');
 return {title,company,description,...parse(description),assessment:{type:'gapwise-custom-jd',version:VERSION,scope:'Recognized explicit JD requirements only; unresolved clauses require review'}};
}
function analyzeJD(candidate,profile,skills=[]){
 if(profile.assessment?.version!==VERSION||typeof profile.description!=='string')throw new Error('JD assessment version mismatch; reload the job description.');
 // Reparse original description on server; never trust the browser's extracted requirements.
 const parsed=parse(profile.description), claims=windows(candidate), rank={not_demonstrated:0,partial:1,demonstrated:2};
 const rows=parsed.requiredSkills.map(r=>{
  const results=r.options.map(o=>{
   if(o.competencyKey){const {evaluate}=require('./role.rubric.analysis.service');const e=evaluate({key:o.competencyKey,id:o.id,requirementType:r.requirementType},candidate,skills,claims,'custom-jd');return {option:o,status:e.evidenceStatus,evidence:e.evidenceDetails,guidance:e.guidance};}
   return {option:o,...assessTech(o,claims,skills),guidance:technologyGuidance(o)};
  }).sort((a,b)=>rank[b.status]-rank[a.status]);const best=results[0],status=best.status;
  return {...r,matchType:'jd-evidence',matchedWith:status==='not_demonstrated'?null:best.option.name,matchScore:rank[status]/2,satisfiesRequirement:status==='demonstrated',relatedSkill:status==='partial',evidenceStatus:status,evidenceDetails:best.evidence.map(e=>({...e,status})),candidateEvidence:best.evidence.map(e=>e.excerpt),evidenceRulesetVersion:VERSION,guidance:r.options.length>1?`Choose one accepted alternative: ${r.anyOf.join(" or ")}. ${best.guidance}`:best.guidance};
 });
 const required=rows.filter(r=>r.requirementType==='required'),preferred=rows.filter(r=>r.requirementType==='preferred');const demonstrated=r=>r.filter(x=>x.satisfiesRequirement).length;
 const coverage=r=>r.length?Math.round(100*demonstrated(r)/r.length):null;
 const unresolved=parsed.unresolvedRequirements, incomplete=unresolved.length>0;
 const matches=rows.filter(r=>r.satisfiesRequirement), gaps=rows.filter(r=>!r.satisfiesRequirement).map(r=>({...r,priorityLevel:r.requirementType==='required'?'high':'medium',actionCategory:r.evidenceStatus==='partial'?'evidence-strengthening':'evidence-or-skill-development'}));
 const readiness={score:incomplete?null:coverage(required),level:'unvalidated',metric:'recognized_required_jd_evidence_coverage',scope:'Explicit recognized JD requirements only, not hiring probability or verified ability',validationStatus:'draft-not-externally-validated',evidenceRulesetVersion:VERSION,summary:{totalRequirements:rows.length,requiredMatches:demonstrated(required),requiredGaps:required.length-demonstrated(required),preferredMatches:demonstrated(preferred),preferredGaps:preferred.length-demonstrated(preferred),requiredCoverage:coverage(required),preferredCoverage:coverage(preferred),partialEvidence:rows.some(r=>r.evidenceStatus==='partial')},explanation:incomplete?'Some JD clauses require review; no overall coverage score is reported. Recognized requirement coverage is shown separately.':`${demonstrated(required)} of ${required.length} recognized required items have qualifying resume evidence.`,evidenceStatusCounts:{demonstrated:matches.length,partial:rows.filter(r=>r.evidenceStatus==='partial').length,notDemonstrated:rows.filter(r=>r.evidenceStatus==='not_demonstrated').length}};
 const roadmap=gaps.map((r,i)=>({order:i+1,skill:r.skill,type:r.actionCategory,priority:r.priorityLevel,evidenceStatus:r.evidenceStatus,candidateEvidence:r.candidateEvidence,estimatedWeeks:null,actions:[r.evidenceStatus==='partial'?'Add a concrete example of applying this requirement, if you have one.':'Check whether you have relevant experience before starting new learning.',r.guidance],guidanceVersion:VERSION}));
 return {matches,gaps,readiness,roadmap,unresolvedRequirements:unresolved,assessmentVersion:VERSION,competencyEvidence:rows.map(r=>({competency:r.skill,status:r.evidenceStatus,evidence:r.evidenceDetails,rulesetVersion:VERSION}))};
}
module.exports={VERSION,parse,buildJobProfile,analyzeJD};
