
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compareSavedReports,
} = require("../src/services/report.comparison.service");

const VERSION = "role-rubric-test-v1";
const METRIC = "required_resume_evidence_coverage";

function criterion(
  id,
  status,
  importance = "required"
) {
  return {
    canonicalSkillId: id,
    skill: id,
    requirementType: importance,
    evidenceStatus: status,
    satisfiesRequirement: status === "demonstrated",
  };
}

function makeReport({
  id = "report-1",
  userId = "user-1",
  targetType = "role",
  targetKey = "role:backend-developer",
  version = VERSION,
  metric = METRIC,
  score = 50,
  createdAt = "2026-11-19 10:00:00",
  items = [
    criterion("backend:api", "partial"),
    criterion("backend:debug", "not_demonstrated"),
    criterion("backend:git", "demonstrated"),
    criterion("backend:docker", "partial", "preferred"),
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
    createdAt,
    targetProfile: {
      title: "Backend Developer",
      assessment: {
        version,
      },
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

function laterReport(overrides = {}) {
  return makeReport({
    id: "report-2",
    score: 75,
    createdAt: "2026-11-20 10:00:00",
    items: [
      criterion("backend:api", "demonstrated"),
      criterion("backend:debug", "demonstrated"),
      criterion("backend:git", "demonstrated"),
      criterion("backend:docker", "partial", "preferred"),
    ],
    ...overrides,
  });
}

function expectCode(fn, code) {
  assert.throws(fn, error => {
    assert.equal(error.code, code);
    return true;
  });
}

test("compares stronger evidence and coverage", () => {
  const result = compareSavedReports(
    makeReport(),
    laterReport()
  );

  assert.equal(result.comparable, true);
  assert.equal(result.coverage.earlierScore, 50);
  assert.equal(result.coverage.laterScore, 75);
  assert.equal(
    result.coverage.changePercentagePoints,
    25
  );

  assert.equal(result.counts.strengthened, 2);
  assert.equal(result.counts.weakened, 0);
  assert.equal(result.counts.unchanged, 2);

  assert.deepEqual(
    result.competencies.strengthened.map(
      item => item.canonicalSkillId
    ),
    ["backend:api", "backend:debug"]
  );
});

test("orders reports by timestamp, not argument order", () => {
  const result = compareSavedReports(
    laterReport(),
    makeReport()
  );

  assert.equal(result.earlier.reportId, "report-1");
  assert.equal(result.later.reportId, "report-2");
});

test("detects weaker evidence", () => {
  const later = laterReport({
    score: 25,
    items: [
      criterion("backend:api", "not_demonstrated"),
      criterion("backend:debug", "not_demonstrated"),
      criterion("backend:git", "partial"),
      criterion("backend:docker", "partial", "preferred"),
    ],
  });

  const result = compareSavedReports(
    makeReport(),
    later
  );

  assert.equal(result.counts.weakened, 2);
  assert.equal(
    result.coverage.changePercentagePoints,
    -25
  );
});

test("preserves unavailable JD coverage", () => {
  const original = makeReport({
    targetType: "jd",
    targetKey: "jd:fixed-fingerprint",
    score: null,
  });

  const updated = laterReport({
    targetType: "jd",
    targetKey: "jd:fixed-fingerprint",
    score: 75,
  });

  const result = compareSavedReports(
    original,
    updated
  );

  assert.equal(result.coverage.earlierScore, null);
  assert.equal(
    result.coverage.changePercentagePoints,
    null
  );
});

test("accepts a valid zero score", () => {
  const result = compareSavedReports(
    makeReport({ score: 0 }),
    laterReport({ score: 25 })
  );

  assert.equal(
    result.coverage.changePercentagePoints,
    25
  );
});

test("rejects comparing the same report", () => {
  const report = makeReport();

  expectCode(
    () => compareSavedReports(report, report),
    "SAME_REPORT"
  );
});

test("rejects reports from different users", () => {
  expectCode(
    () => compareSavedReports(
      makeReport(),
      laterReport({ userId: "user-2" })
    ),
    "DIFFERENT_USERS"
  );
});

test("rejects different target roles", () => {
  expectCode(
    () => compareSavedReports(
      makeReport(),
      laterReport({
        targetKey: "role:data-scientist",
      })
    ),
    "DIFFERENT_TARGETS"
  );
});

test("rejects different JD fingerprints", () => {
  expectCode(
    () => compareSavedReports(
      makeReport({
        targetType: "jd",
        targetKey: "jd:first",
      }),
      laterReport({
        targetType: "jd",
        targetKey: "jd:second",
      })
    ),
    "DIFFERENT_TARGETS"
  );
});

test("rejects different ruleset versions", () => {
  expectCode(
    () => compareSavedReports(
      makeReport(),
      laterReport({
        version: "role-rubric-test-v2",
      })
    ),
    "DIFFERENT_RULESETS"
  );
});

test("rejects different coverage metrics", () => {
  expectCode(
    () => compareSavedReports(
      makeReport(),
      laterReport({
        metric: "another-metric",
      })
    ),
    "DIFFERENT_METRICS"
  );
});

test("rejects changed requirement identities", () => {
  expectCode(
    () => compareSavedReports(
      makeReport(),
      laterReport({
        items: [
          criterion("backend:api", "demonstrated"),
          criterion("backend:debug", "demonstrated"),
          criterion("backend:git", "demonstrated"),
          criterion("backend:kubernetes", "partial", "preferred"),
        ],
      })
    ),
    "DIFFERENT_REQUIREMENTS"
  );
});

test("rejects changed required/preferred importance", () => {
  expectCode(
    () => compareSavedReports(
      makeReport(),
      laterReport({
        items: [
          criterion("backend:api", "demonstrated"),
          criterion("backend:debug", "demonstrated"),
          criterion("backend:git", "demonstrated"),
          criterion("backend:docker", "partial", "required"),
        ],
      })
    ),
    "CHANGED_IMPORTANCE"
  );
});

test("rejects missing canonical competency IDs", () => {
  const bad = laterReport();

  bad.analysis.gaps[0].canonicalSkillId = "";

  expectCode(
    () => compareSavedReports(
      makeReport(),
      bad
    ),
    "MISSING_COMPETENCY_ID"
  );
});

test("rejects duplicate competency IDs", () => {
  const bad = laterReport();

  bad.analysis.gaps.push({
    ...bad.analysis.gaps[0],
  });

  expectCode(
    () => compareSavedReports(
      makeReport(),
      bad
    ),
    "DUPLICATE_COMPETENCY"
  );
});

test("rejects missing evidence status", () => {
  const bad = laterReport();

  delete bad.analysis.gaps[0].evidenceStatus;

  expectCode(
    () => compareSavedReports(
      makeReport(),
      bad
    ),
    "MISSING_EVIDENCE_STATUS"
  );
});

test("rejects inconsistent demonstrated evidence", () => {
  const bad = laterReport();

  bad.analysis.matches[0].satisfiesRequirement = false;

  expectCode(
    () => compareSavedReports(
      makeReport(),
      bad
    ),
    "INCONSISTENT_EVIDENCE"
  );
});

test("rejects reports saved at the same instant", () => {
  expectCode(
    () => compareSavedReports(
      makeReport(),
      laterReport({
        createdAt: "2026-11-19 10:00:00",
      })
    ),
    "AMBIGUOUS_ORDER"
  );
});

test("does not mutate historical snapshots", () => {
  const first = makeReport();
  const second = laterReport();

  const beforeFirst = JSON.stringify(first);
  const beforeSecond = JSON.stringify(second);

  compareSavedReports(first, second);

  assert.equal(JSON.stringify(first), beforeFirst);
  assert.equal(JSON.stringify(second), beforeSecond);
});
