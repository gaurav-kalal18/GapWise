'use strict';

// GapWise-reviewed, explicitly versioned foundations, not a claim that ESCO
// labels are universal hiring requirements. The full ESCO catalog is retained
// by the existing /roles/:id/skills endpoint.
const SOFTWARE_ENGINEER_ESSENTIAL = Object.freeze([
  'debug software',
  'use software design patterns',
  'analyse software specifications',
  'develop software prototype',
  'use software libraries'
]);

const PROGRAMMING_LANGUAGES = Object.freeze([
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#',
  'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala'
]);

const norm = name => typeof name === 'string'
  ? name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
  : '';

function createSoftwareEngineerAssessment(catalog) {
  const available = [
    ...(catalog?.skills?.essential || []),
    ...(catalog?.skills?.optional || [])
  ];
  const byName = new Map();
  for (const skill of available) {
    const name = norm(skill.canonicalName);
    if (!name) continue;
    const entries = byName.get(name) || [];
    entries.push(skill);
    byName.set(name, entries);
  }

  const core = SOFTWARE_ENGINEER_ESSENTIAL.map(name => {
    const candidates = byName.get(norm(name)) || [];
    if (candidates.length !== 1) {
      throw new Error(`Assessment catalog mismatch for ${name}: found ${candidates.length}`);
    }
    return { ...candidates[0], assessmentSource: 'gapwise-reviewed-foundations-v1' };
  });

  // A candidate needs evidence of at least one programming language, not ALL
  // languages in the ESCO occupation. Only explicit resume-extracted skills count.
  const programming = {
    id: 'gapwise:competency:programming-language-experience',
    canonicalName: 'Programming language experience',
    anyOf: [...PROGRAMMING_LANGUAGES],
    assessmentSource: 'gapwise-reviewed-foundations-v1'
  };

  const essential = [programming, ...core];
  return {
    success: true,
    role: catalog.role,
    skills: { essential, optional: [] },
    statistics: { essential: essential.length, optional: 0, total: essential.length },
    assessment: {
      id: 'software-engineer-foundations',
      version: 1,
      type: 'curated-resume-evidence-coverage',
      scope: 'Foundational resume evidence, NOT hiring probability or total job readiness',
      referenceCatalogStatistics: catalog.statistics,
      excludedFromScore: catalog.statistics.total - core.length,
      note: 'ESCO optional technologies remain available in /roles/:id/skills; they are not universal prerequisites.'
    }
  };
}

function buildRoleAssessment(roleId, catalog) {
  if (roleId === 'role:software-engineer') {
    return createSoftwareEngineerAssessment(catalog);
  }
  // Deliberately avoid inventing role-specific rubrics for the other five roles.
  return {
    success: true,
    ...catalog,
    assessment: {
      type: 'unreviewed-esco-coverage',
      note: 'Curated assessment is not yet available for this role; this is legacy ESCO coverage.'
    }
  };
}

module.exports = { buildRoleAssessment, createSoftwareEngineerAssessment };
