
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  aggregateProgress,
} = require("../src/services/progress.service");

function skill(
  id,
  evidenceStatus,
  requirementType = "required"
) {
  return {
    canonicalSkillId: id,
    skill: id,
    evidenceStatus,
    requirementType,
    satisfiesRequirement:
      evidenceStatus === "demonstrated",
  };
}

function makeReport({
  id = "report-1",
  userId = "alice",
  targetType = "role",
  targetKey = "backend-developer",
  version = "role-v1",
  metric = "required_resume_evidence_coverage",
  score = 50,
  date = "2026-11-19 10:00:00",
  items = [
    skill("api", "partial"),
    skill("sql", "demonstrated"),
    skill("git", "partial", "preferred"),
  ],
} = {}) {
  return {
    id,
    userId,
    resumeVersionId: `resume-${id}`,
    resumeLabel: `${id}.pdf`,
    targetType,
    targetKey,
    assessmentVersion: version,
    createdAt: date,

    targetProfile: {
      title: "Backend Developer",
      assessment: { version },
    },

    analysis: {
      assessmentVersion: version,
      readiness: {
        score,
        metric,
        evidenceRulesetVersion: version,
      },
      matches: items.filter(
        item => item.satisfiesRequirement
      ),
      gaps: items.filter(
        item => !item.satisfiesRequirement
      ),
    },
  };
}

function expectCode(fn, code) {
  assert.throws(fn, error => {
    assert.equal(error.code, code);
    return true;
  });
}

test("empty history produces empty progress", () => {
  assert.deepEqual(aggregateProgress([]), {
    totalReports: 0,
    totalTargets: 0,
    totalSeries: 0,
    timelines: [],
  });
});

test("one report creates a single-point timeline", () => {
  const result = aggregateProgress([
    makeReport(),
  ]);

  assert.equal(result.totalReports, 1);
  assert.equal(result.totalTargets, 1);
  assert.equal(result.totalSeries, 1);

  const timeline = result.timelines[0];

  assert.equal(timeline.reportCount, 1);
  assert.equal(timeline.firstScore, 50);
  assert.equal(timeline.latestScore, 50);
  assert.equal(
    timeline.netChangePercentagePoints,
    null
  );
});

test("orders history and calculates negative change", () => {
  const earlier = makeReport({
    score: 50,
    date: "2026-11-19 10:00:00",
  });

  const later = makeReport({
    id: "report-2",
    score: 0,
    date: "2026-11-20 10:00:00",
    items: [
      skill("api", "not_demonstrated"),
      skill("sql", "not_demonstrated"),
      skill("git", "not_demonstrated", "preferred"),
    ],
  });

  // Deliberately pass reports in reverse order.
  const result = aggregateProgress([
    later,
    earlier,
  ]);

  const timeline = result.timelines[0];

  assert.equal(result.totalSeries, 1);
  assert.equal(timeline.firstScore, 50);
  assert.equal(timeline.latestScore, 0);

  assert.equal(
    timeline.netChangePercentagePoints,
    -50
  );

  assert.deepEqual(
    timeline.points.map(point => point.reportId),
    ["report-1", "report-2"]
  );

  assert.equal(
    timeline.points[1]
      .changeFromPreviousPercentagePoints,
    -50
  );
});

test("calculates positive progress", () => {
  const result = aggregateProgress([
    makeReport({ score: 25 }),
    makeReport({
      id: "report-2",
      score: 75,
      date: "2026-11-20 10:00:00",
    }),
  ]);

  assert.equal(
    result.timelines[0].netChangePercentagePoints,
    50
  );
});

test("different roles create separate timelines", () => {
  const result = aggregateProgress([
    makeReport(),
    makeReport({
      id: "report-2",
      targetKey: "data-scientist",
    }),
  ]);

  assert.equal(result.totalTargets, 2);
  assert.equal(result.totalSeries, 2);
});

test("different JD fingerprints remain separate", () => {
  const result = aggregateProgress([
    makeReport({
      targetType: "jd",
      targetKey: "jd:first",
    }),
    makeReport({
      id: "report-2",
      targetType: "jd",
      targetKey: "jd:second",
    }),
  ]);

  assert.equal(result.totalSeries, 2);
});

test("different ruleset versions remain separate", () => {
  const result = aggregateProgress([
    makeReport(),
    makeReport({
      id: "report-2",
      version: "role-v2",
    }),
  ]);

  assert.equal(result.totalTargets, 1);
  assert.equal(result.totalSeries, 2);
});

test("different scoring metrics remain separate", () => {
  const result = aggregateProgress([
    makeReport(),
    makeReport({
      id: "report-2",
      metric: "different-metric",
    }),
  ]);

  assert.equal(result.totalSeries, 2);
});

test("different competency sets remain separate", () => {
  const result = aggregateProgress([
    makeReport(),
    makeReport({
      id: "report-2",
      items: [
        skill("api", "partial"),
        skill("docker", "demonstrated"),
        skill("git", "partial", "preferred"),
      ],
    }),
  ]);

  assert.equal(result.totalSeries, 2);
});

test("required and preferred changes split timelines", () => {
  const result = aggregateProgress([
    makeReport(),
    makeReport({
      id: "report-2",
      items: [
        skill("api", "partial"),
        skill("sql", "demonstrated"),
        skill("git", "partial", "required"),
      ],
    }),
  ]);

  assert.equal(result.totalSeries, 2);
});

test("null scores remain unavailable", () => {
  const result = aggregateProgress([
    makeReport({
      targetType: "jd",
      targetKey: "jd:same",
      score: null,
    }),
    makeReport({
      id: "report-2",
      targetType: "jd",
      targetKey: "jd:same",
      score: 70,
      date: "2026-11-20 10:00:00",
    }),
  ]);

  const timeline = result.timelines[0];

  assert.equal(timeline.firstScore, null);
  assert.equal(timeline.latestScore, 70);
  assert.equal(timeline.scoredReportCount, 1);

  assert.equal(
    timeline.netChangePercentagePoints,
    null
  );

  assert.equal(
    timeline.points[1]
      .changeFromPreviousPercentagePoints,
    null
  );
});

test("identical timestamps do not imply direction", () => {
  const result = aggregateProgress([
    makeReport({
      id: "report-1",
      score: 50,
    }),
    makeReport({
      id: "report-2",
      score: 75,
    }),
  ]);

  const timeline = result.timelines[0];

  assert.equal(timeline.reportCount, 2);

  assert.equal(
    timeline.netChangePercentagePoints,
    null
  );

  assert.equal(
    timeline.points[1]
      .changeFromPreviousPercentagePoints,
    null
  );
});

test("rejects mixed-account histories", () => {
  expectCode(
    () => aggregateProgress([
      makeReport(),
      makeReport({
        id: "report-2",
        userId: "bob",
      }),
    ]),
    "DIFFERENT_USERS"
  );
});

test("rejects duplicate report IDs", () => {
  expectCode(
    () => aggregateProgress([
      makeReport(),
      makeReport(),
    ]),
    "DUPLICATE_REPORT"
  );
});

test("rejects duplicate competency identities", () => {
  expectCode(
    () => aggregateProgress([
      makeReport({
        items: [
          skill("api", "partial"),
          skill("api", "demonstrated"),
        ],
      }),
    ]),
    "DUPLICATE_COMPETENCY"
  );
});

test("rejects missing canonical IDs", () => {
  expectCode(
    () => aggregateProgress([
      makeReport({
        items: [
          skill("", "partial"),
        ],
      }),
    ]),
    "MISSING_COMPETENCY_ID"
  );
});

test("rejects invalid scores", () => {
  expectCode(
    () => aggregateProgress([
      makeReport({ score: 120 }),
    ]),
    "INVALID_SCORE"
  );
});

test("does not mutate saved report snapshots", () => {
  const reports = [
    makeReport(),
    makeReport({
      id: "report-2",
      score: 80,
      date: "2026-11-20 10:00:00",
    }),
  ];

  const before = JSON.stringify(reports);

  aggregateProgress(reports);

  assert.equal(
    JSON.stringify(reports),
    before
  );
});
