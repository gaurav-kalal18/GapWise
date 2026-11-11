'use strict';

// Human-reviewed assessment guidance, not a proficiency inference.
// Applicable only to GapWise's reviewed Software Engineer foundations.
const VERSION = 'software-engineer-actions-v1';
const GUIDANCE = Object.freeze({
  'debug software': {
    partial: [
      'Extend an existing project with a reproducible failing test for a real defect.',
      'Document the debugging steps: reproduction, root cause, code change, and passing regression test.',
      'Include the before/after behavior and a link to the relevant test or commit in your portfolio.'
    ],
    absent: [
      'Choose a small failing application and reproduce a bug with a test.',
      'Use logs or a debugger to isolate the root cause, implement a fix, and confirm it with a regression test.',
      'Document the investigation and fix in a repository README.'
    ]
  },
  'develop software prototype': {
    partial: [
      'Choose an existing project feature and document the problem, constraints, and proposed prototype.',
      'Build a small proof of concept, record what it validates, and compare it with an alternative.',
      'Add an iteration log or demo showing how feedback or test results changed the prototype.'
    ],
    absent: [
      'Define one narrow problem and write acceptance criteria for an initial prototype.',
      'Build a minimal proof of concept and test it against those criteria.',
      'Publish a short demo and document assumptions, results, and next iterations.'
    ]
  },
  'analyse software specifications': {
    partial: [
      'Document the functional and non-functional requirements of an existing project.',
      'Map each requirement to an implementation decision and a verification test.',
      'Explain one ambiguous requirement and how you resolved it.'
    ],
    absent: [
      'Take a small feature request and turn it into clear functional and non-functional requirements.',
      'Identify constraints, edge cases, and acceptance criteria before implementation.',
      'Create a traceability table connecting requirements to tests or implementation decisions.'
    ]
  },
  'use software design patterns': {
    partial: [
      'Identify an existing design decision and explain the specific pattern and why it fits.',
      'Show the implementation and document one alternative or trade-off.',
      'Link a code example that demonstrates the pattern in use.'
    ],
    absent: [
      'Choose a small maintenance problem that benefits from a recognized design pattern.',
      'Implement and test a refactor using the pattern.',
      'Explain the trade-offs and show the code in a portfolio project.'
    ]
  },
  'use software libraries': {
    partial: [
      'Choose a third-party library used in one project and document the feature it enables.',
      'Add an integration example and test, including how errors are handled.',
      'Link the implementation and describe why that library was selected.'
    ],
    absent: [
      'Integrate an appropriate, maintained library into a small project for a specific feature.',
      'Write tests for the integration, including failure cases.',
      'Document usage, constraints, and alternatives.'
    ]
  },
  'Programming language experience': {
    partial: [
      'Link a working implementation in one programming language and explain your contribution.',
      'Add runnable tests and a short explanation of key design decisions.'
    ],
    absent: [
      'Build a small working project using one accepted language from the role requirements.',
      'Include tests, usage instructions, and a link to your implementation.'
    ]
  }
});

const level = evidence => evidence === 'partial' ? 'partial' : 'absent';
const safeName = gap => typeof gap?.skill === 'string' ? gap.skill : '';

function improveEvidenceGaps(gaps) {
  return gaps.map(gap => {
    const status = level(gap.evidenceStatus);
    const requirementImportance = gap.requirementType === 'required' ? 'essential' : 'preferred';
    const category = status === 'partial' ? 'evidence-strengthening' : 'evidence-or-skill-development';
    // These are *action ordering* scores, not probabilities or skill proficiency.
    // A complete absence of supporting resume evidence triggers investigation first;
    // partial evidence is usually a cheaper documentation / practice opportunity.
    const actionPriorityScore = (gap.requirementType === 'required' ? 2 : 1) +
      (status === 'absent' ? 0.5 : 0);
    return {
      ...gap,
      evidenceStatus: gap.evidenceStatus || 'not_demonstrated',
      actionCategory: category,
      requirementImportance,
      actionPriorityScore,
      actionPriorityLevel: actionPriorityScore >= 2.5 ? 'high' : actionPriorityScore >= 1.5 ? 'medium' : 'low',
      priorityReason: status === 'partial'
        ? 'Related evidence exists; verify the competency or strengthen direct evidence.'
        : 'No qualifying evidence found; verify existing experience before treating this as a learning need.',
      // Preserve the established gap score and its interpretation for consumers.
      evidenceActionVersion: VERSION
    };
  }).sort((a,b) => b.actionPriorityScore-a.actionPriorityScore);
}

function createEvidenceRoadmap(gaps) {
  return gaps.map((gap, index) => {
    const status = level(gap.evidenceStatus);
    const name = safeName(gap);
    const actions = GUIDANCE[name]?.[status] || (status === 'partial'
      ? [`Find a concrete work example demonstrating ${name}, and document your role and outcome.`,
         `Add a verifiable project artifact, test, or code link showing ${name}.`]
      : [`Check whether you have prior experience demonstrating ${name}; add explicit, verifiable resume evidence if so.`,
         `If not, complete a focused exercise demonstrating ${name} and retain the implementation or test artifact.`]);
    return {
      order: index+1,
      skill: name,
      type: status === 'partial' ? 'evidence-strengthening' : 'evidence-or-skill-development',
      priority: gap.actionPriorityLevel,
      actionPriorityScore: gap.actionPriorityScore,
      evidenceStatus: gap.evidenceStatus,
      candidateEvidence: gap.candidateEvidence || [],
      reason: gap.priorityReason,
      estimatedWeeks: null, // Avoid fabricated effort estimates from missing context.
      actions: [...actions],
      guidanceVersion: VERSION
    };
  });
}

module.exports = { improveEvidenceGaps, createEvidenceRoadmap, VERSION };
