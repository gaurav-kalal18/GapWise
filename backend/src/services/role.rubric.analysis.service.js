'use strict';
const { C, VERSION, getRequirements } = require('./role.rubric.service');
const { improveEvidenceGaps, createEvidenceRoadmap } = require('./evidence.action.service');
const norm = s => String(s ?? '').trim().toLowerCase();
const DISQUALIFY = /\b(?:not|never|without|no experience|planning|planned|intend|want to|learning|familiar with|assisted|observed)\b/i;
const {windows,hasLanguageStack}=require('./resume.context.service');
// Require an action directed at an appropriate object, not two arbitrary words.
const apiIntegration=/\b(?:integrated|consumed)\s+(?:the\s+|an?\s+)?(?:(?!(?:tests?|testing|frameworks?|tools?|simulators?|to|for|of|and)\b)[\w.-]+\s+){0,4}(?:APIs?|endpoints?|web services?)\b/i;
const apiDevelopment=/\b(?:built|developed|implemented|designed|maintained|created)\s+(?:(?:a|an|the|new|secure|public|internal|REST(?:ful)?|GraphQL|gRPC|backend|payment|web|multiple|\d+)[ -]+){0,7}(?:APIs?|endpoints?|web services?)\b/i;
const directPatterns={
 deployment:/\b(?:deployed|released)\s+(?:(?:a|an|the|our|my|new|production|backend|frontend|web|full-stack|containerized|[\w.-]+)[ -]+){0,7}(?:applications?|apps?|APIs?|services?|frontends?|backends?|models?|platforms?|sites?)\b|\bcontaineri[sz]ed\s+(?:(?:a|an|the|our|my|[\w.-]+)\s+){0,5}(?:applications?|apps?|databases?|services?|APIs?)\b|\b(?:configured|automated|implemented)\s+(?:(?:a|an|the|our|my|[\w.-]+)\s+){0,4}(?:CI\/CD|deployment pipelines?|deployments?)\b/i,
 version:/\b(?:used|managed|created|configured|committed|rebased|merged)\s+(?:(?:a|an|the|our|my|[\w.-]+)\s+){0,4}(?:git branches|git repositories|version control|commits?|branches|pull requests?)\b|\b(?:used|worked with)\s+git\b/i,
};
function directEvidence(key,claim,action,subject,roleId){
 const e=claim.excerpt;
 if(DISQUALIFY.test(e))return false;
 if(key==='algorithms' && ['codingProfiles','achievements','positions'].includes(claim.source))return /\bsolved\s+(?:over\s+|more than\s+)?[\d,]+\+?\s+(?:algorithmic|competitive programming|data structures and algorithms|DSA)\s+(?:problems?|challenges?)\b/i.test(e)||/\b(?:designed|implemented|validated)\s+(?:[\w-]+\s+){0,4}(?:competitive programming|algorithmic)\s+problems?\b/i.test(e);
 if(!['projects','experience'].includes(claim.source))return false;
 if(key==='programming')return action.test(e)&&(subject.test(e)||hasLanguageStack(claim.technologyContext))&&(/\b(?:applications?|apps?|platforms?|services?|software|tools?|apis?|systems?|components?|features?|frameworks?|scripts?|modules?|algorithms?|programs?|functions?|code)\b/i.test(e)||/\b(?:coded|programmed)\b/i.test(e));
 if(key==='api')return apiDevelopment.test(e)||(!['role:backend-developer','role:full-stack-developer'].includes(roleId)&&apiIntegration.test(e));
 if(directPatterns[key])return directPatterns[key].test(e);
 return action.test(e)&&subject.test(e);
}
function evaluate(requirement, profile, candidateSkills, claims, roleId) {
  const [label,action,subject,aliases,guidance]=C[requirement.key];
  const direct=claims.filter(c=>directEvidence(requirement.key,c,action,subject,roleId));
  // A technology declaration is relevant, not proof of implementation.
  const names=new Set(aliases.map(norm));
  const declared=candidateSkills.filter(s=>names.has(norm(s?.canonicalName || s?.skill || s?.name)));
  const relatedDebug=requirement.key==='debugging' ? claims.filter(c=>['projects','experience'].includes(c.source)&&!DISQUALIFY.test(c.excerpt)&&/\b(?:reproduced?|reproduce|validated?|validate|investigated|isolated)\b/i.test(c.excerpt)&&subject.test(c.excerpt)) : [];
  const relatedApi=requirement.key==='api' ? claims.filter(c=>['projects','experience'].includes(c.source)&&!DISQUALIFY.test(c.excerpt)&&(apiIntegration.test(c.excerpt)||(/\b(?:tested|deployed|validate|validated|reproduce|reproduced)\b/i.test(c.excerpt)&&subject.test(c.excerpt)))) : [];
  const coursework=typeof profile?.coursework==='string' && requirement.key==='algorithms' && /\bdata structures and algorithms\b/i.test(profile.coursework);
  const status=direct.length?'demonstrated':declared.length||relatedDebug.length||relatedApi.length||coursework?'partial':'not_demonstrated';
  const evidenceDetails=direct.length?direct.slice(0,3).map(c=>({...c,ruleId:`${requirement.key}:${requirement.key==='programming'&&c.technologyContext&&!subject.test(c.excerpt)?'project-stack-and-implementation':'contextual-claim'}`,status})):[...relatedDebug.map(c=>({...c,ruleId:'debugging:related-validation',status})),...relatedApi.map(c=>({...c,ruleId:'api:related-use-not-development',status})),...declared.map(s=>({source:'extracted-skill',excerpt:s.canonicalName||s.skill||s.name,ruleId:`${requirement.key}:declared-technology`,status})),...(coursework?[{source:'coursework',excerpt:'Data Structures and Algorithms',ruleId:'algorithms:coursework',status}]:[])].slice(0,3);
  return {skill:label,canonicalSkillId:requirement.id,requirementType:requirement.requirementType,matchType:'competency-evidence',matchedWith:null,relatedSkill:status==='partial',matchScore:status==='demonstrated'?1:status==='partial'?0.5:0,satisfiesRequirement:status==='demonstrated',evidenceStatus:status,evidenceDetails,candidateEvidence:evidenceDetails.map(e=>e.excerpt),evidenceRulesetVersion:VERSION,evidenceBasis:direct.length?'contextual-resume-claim':status==='partial'?'related-or-declared-evidence':'no-qualifying-evidence',guidance:requirement.key==='api'&&['role:backend-developer','role:full-stack-developer'].includes(roleId)?'Implement API endpoints with validation, error handling and documented requests.':guidance};
}
function isRubricProfile(jobProfile){return jobProfile?.assessment?.type==='gapwise-role-rubric';}
function analyzeRubric(candidateProfile,jobProfile,candidateSkills=[]) {
  // Never trust the browser to redefine a role's assessed requirements.
  if(jobProfile.assessment?.id!==jobProfile.roleId || jobProfile.assessment?.version!==VERSION) throw new Error('Role assessment version mismatch; reload the target role.');
  const requirements=getRequirements(jobProfile.roleId);
  const claims=windows(candidateProfile);
  const evaluated=requirements.map(r=>evaluate(r,candidateProfile,candidateSkills,claims,jobProfile.roleId));
  const matches=evaluated.filter(r=>r.satisfiesRequirement);
  const gaps=improveEvidenceGaps(evaluated.filter(r=>!r.satisfiesRequirement)).map(r=>({...r,priorityLevel:r.actionPriorityLevel,priorityScore:r.actionPriorityScore}));
  const counts=rows=>({demonstrated:rows.filter(r=>r.evidenceStatus==='demonstrated').length,partial:rows.filter(r=>r.evidenceStatus==='partial').length,notDemonstrated:rows.filter(r=>r.evidenceStatus==='not_demonstrated').length});
  const coverage=rows=>rows.length?Math.round(100*counts(rows).demonstrated/rows.length):null;
  const required=evaluated.filter(r=>r.requirementType==='required'), preferred=evaluated.filter(r=>r.requirementType==='preferred');
  const requiredCoverage=coverage(required), preferredCoverage=coverage(preferred);
  // Main number = essential evidence coverage. Preferred never dilutes it.
  const readiness={score:requiredCoverage,level:'unvalidated',metric:'required_resume_evidence_coverage',scope:'Entry-level resume evidence only; not verified ability or hiring probability',validationStatus:'draft-not-externally-validated',evidenceRulesetVersion:VERSION,evidenceStatusCounts:counts(evaluated),summary:{totalRequirements:evaluated.length,requiredMatches:counts(required).demonstrated,requiredGaps:required.length-counts(required).demonstrated,preferredMatches:counts(preferred).demonstrated,preferredGaps:preferred.length-counts(preferred).demonstrated,requiredCoverage,preferredCoverage,partialEvidence:counts(evaluated).partial>0},explanation:`${counts(required).demonstrated} of ${required.length} required competencies have qualifying resume evidence; preferred coverage is reported separately.`};
  const roadmap=createEvidenceRoadmap(gaps).map((item,i)=>({...item,guidanceVersion:VERSION,actions:[gaps[i].evidenceStatus==='partial'?'Verify existing experience and add a specific example if available.':'Check whether you already have relevant experience before starting new learning.',gaps[i].guidance]}));
  return {matches,gaps,readiness,roadmap,competencyEvidence:evaluated.map(r=>({competency:r.skill,status:r.evidenceStatus,evidence:r.evidenceDetails,rulesetVersion:VERSION})),assessmentVersion:VERSION};
}
module.exports={analyzeRubric,isRubricProfile,windows};
