const fs = require('node:fs');
const path = require('node:path');

const ESCO_SKILLS_PATH = path.join(__dirname, '../../data/gapwise/skills.json');

// Deliberate, reviewed equivalences. Never infer that a generic category
// (e.g. 'computer programming') is satisfied by an individual technology.
const TECHNOLOGY_TO_ESCO_NAME = Object.freeze({
  'tech:java': 'Java (computer programming)',
  'tech:python': 'Python (computer programming)',
  'tech:javascript': 'JavaScript',
  'tech:cpp': 'C++',
  'tech:typescript': 'TypeScript'
});

const key = name => typeof name === 'string'
  ? name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
  : '';

// Pure factory enables meaningful tests without reading the 14k-entry ESCO
// catalog. Ambiguous names are intentionally rejected.
function createIdentityResolver(skills) {
  const byName = new Map();
  const byId = new Set();

  for (const skill of skills) {
    if (!skill?.id || !key(skill.canonicalName)) continue;
    byId.add(skill.id);
    const name = key(skill.canonicalName);
    const list = byName.get(name) || [];
    list.push(skill);
    byName.set(name, list);
  }

  function uniqueSkillByName(name) {
    const matches = byName.get(key(name)) || [];
    return matches.length === 1 ? matches[0] : null;
  }

  function resolveCandidateSkill(skill) {
    if (!skill || typeof skill !== 'object') return skill;

    // Already verified ESCO identity: keep it, do not infer a replacement.
    if (skill.canonicalSkillId && byId.has(skill.canonicalSkillId)) {
      return skill;
    }

    // Resume extractor IDs use the tech: namespace and are NOT ESCO IDs.
    if (skill.source !== 'gapwise-technology' ||
        !Object.hasOwn(TECHNOLOGY_TO_ESCO_NAME, skill.skillId)) {
      return skill;
    }

    const concept = uniqueSkillByName(TECHNOLOGY_TO_ESCO_NAME[skill.skillId]);
    if (!concept) return skill; // no guess when absent or ambiguous

    return {
      ...skill,
      canonicalSkillId: concept.id,
      identityResolution: 'curated-technology-to-esco'
    };
  }

  return {
    resolveCandidateSkill,
    resolveCandidateSkills: skills => skills.map(resolveCandidateSkill),
    uniqueSkillByName
  };
}

let defaultResolver;
function resolveCandidateSkills(skills) {
  if (!defaultResolver) {
    defaultResolver = createIdentityResolver(
      JSON.parse(fs.readFileSync(ESCO_SKILLS_PATH, 'utf8'))
    );
  }
  return defaultResolver.resolveCandidateSkills(skills);
}

module.exports = { createIdentityResolver, resolveCandidateSkills };
