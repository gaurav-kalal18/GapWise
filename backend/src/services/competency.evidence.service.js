'use strict';

// Conservative, auditable v1 rules for selected Software Engineer foundations.
// No implicit 'knows X' from technology names or from coursework alone.
// Each observed claim points to a verbatim source excerpt.
const RULESET_VERSION = 'software-engineer-evidence-v1.1';

const COMPETENCIES = Object.freeze({
  'debug software': [
    { id: 'debug-explicit', status: 'demonstrated', action: /\b(?:debugged|debugging|troubleshot|troubleshooting|diagnosed|fixed|resolved)\b/i,
      subject: /\b(?:bug|bugs|error|errors|failure|failures|defect|defects|race conditions?|deadlocks?|software issues?)\b/i },
    { id: 'debug-related-validation', status: 'partial', action: /\b(?:reproduc(?:e|ed|ing)|validat(?:e|ed|ing)|investigat(?:e|ed|ing)|isolat(?:e|ed|ing))\b/i,
      subject: /\b(?:race conditions?|deadlocks?|bugs?|software errors?|defects?|failures?)\b/i }
  ],
  'use software design patterns': [
    { id: 'named-pattern-applied', status: 'demonstrated', action: /\b(?:implemented|applied|used|leveraged|refactored|designed)\b/i,
      subject: /\b(?:strategy|factory|observer|adapter|repository|singleton|decorator|builder|command)\s+pattern\b/i }
  ],
  'analyse software specifications': [
    { id: 'specifications-analyzed', status: 'demonstrated', action: /\b(?:analy[sz]ed|reviewed|interpreted|translated)\b/i,
      subject: /\b(?:software|technical|functional|system|api)\s+(?:specifications?|requirements?)\b/i }
  ],
  'develop software prototype': [
    { id: 'prototype-built', status: 'demonstrated', action: /\b(?:built|developed|created|implemented|tested|iterated)\b/i,
      subject: /\b(?:prototypes?|proof[- ]of[- ]concept|poc)\b/i },
    { id: 'application-built-not-prototype-proven', status: 'partial', action: /\b(?:built|developed|created|implemented)\b/i,
      subject: /\b(?:applications?|platforms?|frameworks?|tools?|apis?|services?)\b/i }
  ],
  'use software libraries': [
    // Language and framework neutral: requires actual use/integration, not a
    // stack name or a bare list of technologies.
    { id: 'library-explicit-integration', status: 'demonstrated',
      action: /\b(?:integrated|implemented|developed|built|created|used|leveraged|extended|maintained)\b/i,
      subject: /\b(?:third[- ]party\s+)?(?:software\s+)?(?:libraries|library|packages|package|sdks?|dependencies)\b/i },
    { id: 'framework-explicit-integration', status: 'demonstrated',
      action: /\b(?:integrated|used|leveraged|extended|configured|adopted)\b/i,
      subject: /\b(?:software\s+)?frameworks?\b/i }
  ]
});

// Reject common negation/future-only wording. These are deliberately local
// guards; v1 does not claim full natural-language understanding.
const DISQUALIFY = /\b(?:not|never|without|no experience (?:with|in)|plan(?:ned)? to|planning to|intend to|would like to|want to|learning to|currently learning)\b/i;
// Stack-neutral reuse rule: implementing reusable components/services with an
// identifiable framework is evidence of working with a software framework.
// Names come from an extensible taxonomy, not a specific candidate's projects.
const technologyTaxonomy = require('./technology.taxonomy');
const FRAMEWORKS = technologyTaxonomy.filter(t =>
  ['framework', 'framework-library', 'orm'].includes(t.category)
);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const frameworkNamePattern = new RegExp(
  '(?<![a-z0-9])(?:' + FRAMEWORKS.flatMap(t => [t.canonicalName, ...(t.aliases || [])])
    .filter(Boolean).map(esc).sort((a,b) => b.length-a.length).join('|') + ')(?![a-z0-9])', 'i'
);
const implementationAction = /\b(?:built|created|implemented|developed|integrated|maintained|refactored|extended)\b/i;
const frameworkArtifact = /\b(?:components?|services?|modules?|middleware|adapters?|integrations?|models?|schemas?)\b/i;
const STRENGTH = { demonstrated: 2, partial: 1, not_demonstrated: 0 };

function evidenceWindows(profile) {
  const windows = [];
  for (const section of ['projects', 'experience']) {
    const value = profile?.[section];
    if (typeof value !== 'string') continue;
    // One line is typically one resume bullet. Never cross bullets or
    // headings to manufacture an action + a subject from separate claims.
    for (const rawLine of value.split(/\r?\n/)) {
      const excerpt = rawLine.trim().replace(/^[-•*]\s*/, '').trim();
      if (excerpt && excerpt.length >= 15 && excerpt.length <= 1200) {
        windows.push({ source: section, excerpt });
      }
    }
  }
  return windows;
}

function evaluateCompetency(profile, name) {
  const canonicalName = typeof name === 'string' ? name.trim().toLowerCase() : '';
  const rules = COMPETENCIES[canonicalName];
  if (!rules) return null; // Never change unrelated ESCO/JD skills.

  const hits = [];
  for (const item of evidenceWindows(profile)) {
    // Can't infer semantic scope reliably in negated or aspirational claims.
    if (DISQUALIFY.test(item.excerpt)) continue;
    if (canonicalName === 'use software libraries' &&
        implementationAction.test(item.excerpt) &&
        frameworkArtifact.test(item.excerpt) &&
        frameworkNamePattern.test(item.excerpt)) {
      hits.push({ status: 'demonstrated', ruleId: 'framework-implementation-from-taxonomy',
        source: item.source, excerpt: item.excerpt });
    }
    for (const rule of rules) {
      if (rule.action.test(item.excerpt) && rule.subject.test(item.excerpt)) {
        hits.push({ status: rule.status, ruleId: rule.id, source: item.source, excerpt: item.excerpt });
      }
    }
  }

  hits.sort((a, b) => STRENGTH[b.status] - STRENGTH[a.status]);
  const best = hits[0];
  return {
    competency: name,
    status: best?.status || 'not_demonstrated',
    evidence: best ? hits.filter(h => h.status === best.status).slice(0, 3) : [],
    basis: best ? 'explicit-project-or-experience-text-rule' : 'no-qualifying-explicit-project-or-experience-evidence',
    rulesetVersion: RULESET_VERSION,
    note: 'Evidence classification, not proof of ability or inability.'
  };
}

function evaluateCompetencies(profile, requirements) {
  return requirements
    .map(r => evaluateCompetency(profile, r?.skill || r?.canonicalName || r?.name))
    .filter(Boolean);
}

module.exports = { evaluateCompetency, evaluateCompetencies, evidenceWindows, RULESET_VERSION };
