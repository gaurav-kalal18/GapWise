
'use strict';
const { C, VERSION, getRequirements } = require('./role.rubric.service');
const { improveEvidenceGaps, createEvidenceRoadmap } = require('./evidence.action.service');
const norm = s => String(s ?? '').trim().toLowerCase();
const DISQUALIFY = /\b(?:not|never|without|no experience|planning|planned|intend|want to|learning|familiar with|assisted|observed)\b/i;
function windows(profile) {
  const out=[];
  for (const source of ['projects','experience']) {
    const value=profile?.[source];
    if(typeof value!=='string') continue;
    // Keep claims local. PDF continuation reconstruction is a separate task.
    for(const line of value.split(/\r?\n/)) {
      const excerpt=line.trim().replace(/^[-•*]\s*/, '');
      if(excerpt.length>=15 && excerpt.length<=1200 && !DISQUALIFY.test(excerpt)) out.push({source,excerpt});
    }
  }
  return out;
}
function evaluate(requirement, profile, candidateSkills, claims) {
  const [label,action,subject,aliases,guidance]=C[requirement.key];
  const direct=claims.filter(c=>action.test(c.excerpt)&&subject.test(c.excerpt));
  // A technology declaration is relevant, not proof of implementation.
  const names=new Set(aliases.map(norm));
  const declared=candidateSkills.filter(s=>names.has(norm(s?.canonicalName || s?.skill || s?.name)));
  const relatedDebug=requirement.key==='debugging' ? claims.filter(c=>/\b(?:reproduced?|reproduce|validated?|validate|investigated|isolated)\b/i.test(c.excerpt)&&subject.test(c.excerpt)) : [];
  const coursework=typeof profile?.coursework==='string' && requirement.key==='algorithms' && /\bdata structures and algorithms\b/i.test(profile.coursework);
  const status=direct.length?'demonstrated':declared.length||relatedDebug.length||coursework?'partial':'not_demonstrated';
  const evidenceDetails=direct.length?direct.slice(0,3).map(c=>({...c,ruleId:`${requirement.key}:action-subject`,status})):[...relatedDebug.map(c=>({...c,ruleId:'debugging:related-validation',status})),...declared.map(s=>({source:'extracted-skill',excerpt:s.canonicalName||s.skill||s.name,ruleId:`${requirement.key}:declared-technology`,status})),...(coursework?[{source:'coursework',excerpt:'Data Structures and Algorithms',ruleId:'algorithms:coursework',status}]:[])].slice(0,3);
  return {skill:label,canonicalSkillId:requirement.id,requirementType:requirement.requirementType,matchType:'competency-evidence',matchedWith:null,relatedSkill:status==='partial',matchScore:status==='demonstrated'?1:status==='partial'?0.5:0,satisfiesRequirement:status==='demonstrated',evidenceStatus:status,evidenceDetails,candidateEvidence:evidenceDetails.map(e=>e.excerpt),evidenceRulesetVersion:VERSION,evidenceBasis:direct.length?'action-and-subject-in-local-claim':status==='partial'?'related-or-declared-evidence':'no-qualifying-evidence',guidance};
}
function isRubricProfile(jobProfile){return jobProfile?.assessment?.type==='gapwise-role-rubric';}
function analyzeRubric(candidateProfile,jobProfile,candidateSkills=[]) {
  // Never trust the browser to redefine a role's assessed requirements.
  if(jobProfile.assessment?.id!==jobProfile.roleId || jobProfile.assessment?.version!==VERSION) throw new Error('Role assessment version mismatch; reload the target role.');
  const requirements=getRequirements(jobProfile.roleId);
  const claims=windows(candidateProfile);
  const evaluated=requirements.map(r=>evaluate(r,candidateProfile,candidateSkills,claims));
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
