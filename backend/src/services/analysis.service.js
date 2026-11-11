const { analyzeRubric, isRubricProfile } = require('./role.rubric.analysis.service');
const { matchSkills } = require('./matching.service');
const { prioritizeGaps } = require('./priority.service');
const { calculateReadiness } = require('./readiness.service');
const { prioritizeByDependencies } = require('./dependency.service');
const { generateRoadmap } = require('./roadmap.service');
const { resolveCandidateSkills } = require('./skill.identity.service');
const { evaluateCompetencies } = require('./competency.evidence.service');
const { improveEvidenceGaps, createEvidenceRoadmap } = require('./evidence.action.service');

const normalize = name => typeof name === 'string'
  ? name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
  : '';

// A conjunctive role competency can be satisfied by ONE explicit alternative.
// This is a scoped OR rule, not an equivalence between technology concepts.
function evaluateAlternatives(candidateSkills, requirement) {
  const options = requirement.anyOf;
  if (!Array.isArray(options) || !options.length) return null;
  const names = new Set(options.map(normalize).filter(Boolean));
  const candidates = candidateSkills
    .filter(candidate => names.has(normalize(candidate.canonicalName || candidate.skill || candidate.name)))
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const matched = candidates[0];
  const skill = requirement.skill || requirement.canonicalName || requirement.name;
  const requirementType = requirement.requirementType || 'required';
  if (!matched) {
    return { satisfied: false, result: {
      skill, requirementType, matchType: 'gap', matchedWith: null,
      relatedSkill: false, matchScore: 0, satisfiesRequirement: false,
      basis: 'none-of-the-explicit-alternatives-found'
    }};
  }
  return { satisfied: true, result: {
    skill, requirementType, matchType: 'alternative',
    matchedWith: matched.canonicalName || matched.skill || matched.name,
    matchScore: 1, satisfiesRequirement: true,
    candidateConfidence: matched.confidence ?? null,
    candidateEvidence: matched.evidence ?? null,
    basis: 'explicit-resume-evidence-of-one-accepted-alternative',
    acceptedAlternativeCount: options.length
  }};
}

function analyzeResolvedCandidate(candidateSkills, jobProfile, candidateProfile = {}) {
  if (isRubricProfile(jobProfile)) return analyzeRubric(candidateProfile, jobProfile, candidateSkills);
  const requiredSkills = jobProfile.requiredSkills || [];
  const regular = requiredSkills.filter(r => !r || !Array.isArray(r.anyOf));
  const alternate = requiredSkills.filter(r => r && Array.isArray(r.anyOf));
  const result = matchSkills(candidateSkills, regular);
  for (const requirement of alternate) {
    const evaluated = evaluateAlternatives(candidateSkills, requirement);
    if (!evaluated) continue;
    (evaluated.satisfied ? result.matches : result.gaps).push(evaluated.result);
  }
  // Only reviewed Software Engineer foundations use the v1 competency rules.
  // Custom JDs and unreviewed legacy roles keep their original matching.
  const isReviewedSoftwareEngineer =
    jobProfile?.roleId === 'role:software-engineer' &&
    jobProfile?.assessment?.id === 'software-engineer-foundations' &&
    jobProfile?.assessment?.type === 'curated-resume-evidence-coverage';
  const competencyEvidence = isReviewedSoftwareEngineer
    ? evaluateCompetencies(candidateProfile, regular)
    : [];
  for (const evaluation of competencyEvidence) {
    const requirement = regular.find(r =>
      (r.skill || r.canonicalName || r.name) === evaluation.competency
    );
    if (!requirement) continue;
    // A verified canonical ID match takes precedence over weaker text rules.
    if (result.matches.some(m => m.skill === evaluation.competency && m.satisfiesRequirement)) continue;
    if (evaluation.status === 'not_demonstrated') continue;

    const gapIndex = result.gaps.findIndex(g => g.skill === evaluation.competency);
    const relatedIndex = result.matches.findIndex(m => m.skill === evaluation.competency);
    const base = gapIndex >= 0 ? result.gaps[gapIndex]
      : relatedIndex >= 0 ? result.matches[relatedIndex] : null;
    if (!base) continue;
    if (gapIndex >= 0) result.gaps.splice(gapIndex, 1);
    else result.matches.splice(relatedIndex, 1);

    const supported = evaluation.status === 'demonstrated';
    result.matches.push({
      ...base,
      requirementType: requirement.requirementType || 'required',
      matchType: 'competency-evidence',
      matchedWith: null,
      matchScore: supported ? 1 : 0.5,
      satisfiesRequirement: supported,
      candidateEvidence: evaluation.evidence.map(e => e.excerpt),
      evidenceDetails: evaluation.evidence,
      evidenceStatus: evaluation.status,
      evidenceBasis: evaluation.basis,
      evidenceRulesetVersion: evaluation.rulesetVersion,
      evidenceStrength: supported ? 1 : 0.5,
      relatedSkill: !supported
    });
  }

  const satisfiedMatches = result.matches.filter(match => match.satisfiesRequirement);
  const partialMatches = result.matches.filter(match => !match.satisfiesRequirement);
  const prioritizedGaps = prioritizeGaps([...partialMatches, ...result.gaps]);
  const dependencyGaps = prioritizeByDependencies(prioritizedGaps, candidateSkills);
  const gaps = isReviewedSoftwareEngineer ? improveEvidenceGaps(dependencyGaps) : dependencyGaps;
  const readiness = calculateReadiness(satisfiedMatches, gaps);
  if (isReviewedSoftwareEngineer) {
    readiness.metric = 'resume_evidence_coverage';
    readiness.evidenceRulesetVersion = require('./competency.evidence.service').RULESET_VERSION;
    readiness.evidenceStatusCounts = {
      demonstrated: competencyEvidence.filter(e => e.status === 'demonstrated').length,
      partial: competencyEvidence.filter(e => e.status === 'partial').length,
      notDemonstrated: competencyEvidence.filter(e => e.status === 'not_demonstrated').length
    };
    readiness.scope = jobProfile.assessment.scope;
    readiness.explanation = `${readiness.summary?.requiredMatches ?? 0} of ${(readiness.summary?.requiredMatches ?? 0) + (readiness.summary?.requiredGaps ?? 0)} reviewed foundational requirements have explicit supporting resume evidence. This is not a probability of being hired.`;
  }
  const roadmap = isReviewedSoftwareEngineer ? createEvidenceRoadmap(gaps) : generateRoadmap(gaps, candidateSkills);
  return { matches: satisfiedMatches, gaps, readiness, roadmap, ...(isReviewedSoftwareEngineer ? { competencyEvidence } : {}) };
}

function analyzeCandidateAgainstJob(candidateProfile, jobProfile) {
  return analyzeResolvedCandidate(resolveCandidateSkills(candidateProfile.skills || []), jobProfile, candidateProfile);
}

module.exports = { analyzeCandidateAgainstJob, analyzeResolvedCandidate, evaluateAlternatives };
