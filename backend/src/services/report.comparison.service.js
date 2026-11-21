
"use strict";

const STATUS_RANK = Object.freeze({
  not_demonstrated: 0,
  partial: 1,
  demonstrated: 2,
});

const VALID_TARGET_TYPES = new Set(["role", "jd"]);
const VALID_IMPORTANCE = new Set(["required", "preferred"]);

class ComparisonError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ComparisonError";
    this.code = code;
    this.status = 422;
  }
}

function reject(code, message) {
  throw new ComparisonError(code, message);
}

function nonEmptyString(value) {
  return typeof value === "string" &&
    value.trim().length > 0;
}

function getVersion(report) {
  const versions = [
    report.assessmentVersion,
    report.analysis?.assessmentVersion,
    report.analysis?.readiness?.evidenceRulesetVersion,
    report.targetProfile?.assessment?.version,
  ].filter(nonEmptyString);

  if (!versions.length) {
    reject(
      "MISSING_VERSION",
      "Assessment version is missing."
    );
  }

  if (new Set(versions).size !== 1) {
    reject(
      "INCONSISTENT_VERSION",
      "The report contains conflicting assessment versions."
    );
  }

  return versions[0];
}

function getScore(report) {
  const readiness = report.analysis?.readiness;

  if (!readiness || typeof readiness !== "object") {
    reject(
      "INVALID_ANALYSIS",
      "The report has no valid readiness summary."
    );
  }

  const score = readiness.score;

  if (score === null) return null;

  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    reject(
      "INVALID_SCORE",
      "The report contains an invalid coverage score."
    );
  }

  return score;
}

function getMetric(report) {
  const metric = report.analysis?.readiness?.metric;

  if (!nonEmptyString(metric)) {
    reject(
      "MISSING_METRIC",
      "The report is missing its scoring metric."
    );
  }

  return metric;
}

function getStatus(item) {
  if (
    !item ||
    !Object.hasOwn(STATUS_RANK, item.evidenceStatus)
  ) {
    reject(
      "MISSING_EVIDENCE_STATUS",
      "A competency has no recognized evidence status."
    );
  }

  return item.evidenceStatus;
}

function extractCompetencies(report) {
  const analysis = report.analysis;

  if (
    !Array.isArray(analysis?.matches) ||
    !Array.isArray(analysis?.gaps)
  ) {
    reject(
      "INVALID_ANALYSIS",
      "The report is missing assessment results."
    );
  }

  const items = [
    ...analysis.matches,
    ...analysis.gaps,
  ];

  if (!items.length) {
    reject(
      "EMPTY_ASSESSMENT",
      "The report contains no assessed competencies."
    );
  }

  const map = new Map();

  for (const item of items) {
    if (!nonEmptyString(item?.canonicalSkillId)) {
      reject(
        "MISSING_COMPETENCY_ID",
        "A competency is missing its canonical identity."
      );
    }

    const id = item.canonicalSkillId.trim();

    if (map.has(id)) {
      reject(
        "DUPLICATE_COMPETENCY",
        `Duplicate competency identity: ${id}`
      );
    }

    if (!VALID_IMPORTANCE.has(item.requirementType)) {
      reject(
        "INVALID_IMPORTANCE",
        `Invalid requirement importance for ${id}.`
      );
    }

    const status = getStatus(item);

    // Reject internally inconsistent stored results.
    if (
      (status === "demonstrated") !==
      (item.satisfiesRequirement === true)
    ) {
      reject(
        "INCONSISTENT_EVIDENCE",
        `Inconsistent evidence result for ${id}.`
      );
    }

    map.set(id, {
      id,
      name: item.skill ||
        item.canonicalName ||
        id,
      requirementType: item.requirementType,
      status,
    });
  }

  return map;
}

function validateReport(report) {
  if (!report || typeof report !== "object") {
    reject(
      "INVALID_REPORT",
      "Both saved reports must be valid objects."
    );
  }

  if (
    !nonEmptyString(report.id) ||
    !nonEmptyString(report.userId) ||
    !VALID_TARGET_TYPES.has(report.targetType) ||
    !nonEmptyString(report.targetKey) ||
    !nonEmptyString(report.createdAt)
  ) {
    reject(
      "INVALID_REPORT",
      "A report is missing required identity or date fields."
    );
  }

  if (
    !report.targetProfile ||
    typeof report.targetProfile !== "object"
  ) {
    reject(
      "INVALID_REPORT",
      "The saved target snapshot is missing."
    );
  }

  const timestamp = Date.parse(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
      .test(report.createdAt)
      ? `${report.createdAt.replace(" ", "T")}Z`
      : report.createdAt
  );

  if (!Number.isFinite(timestamp)) {
    reject(
      "INVALID_TIMESTAMP",
      "A report has an invalid creation timestamp."
    );
  }

  return {
    id: report.id,
    userId: report.userId,
    targetType: report.targetType,
    targetKey: report.targetKey,
    version: getVersion(report),
    metric: getMetric(report),
    score: getScore(report),
    timestamp,
    createdAt: report.createdAt,
    resumeVersionId: report.resumeVersionId || null,
    resumeLabel: report.resumeLabel || null,
    competencies: extractCompetencies(report),
  };
}

function checkCompatibility(a, b) {
  if (a.id === b.id) {
    reject(
      "SAME_REPORT",
      "Select two different saved reports."
    );
  }

  if (a.userId !== b.userId) {
    reject(
      "DIFFERENT_USERS",
      "Reports must belong to the same account."
    );
  }

  if (
    a.targetType !== b.targetType ||
    a.targetKey !== b.targetKey
  ) {
    reject(
      "DIFFERENT_TARGETS",
      "Both reports must assess the same role or job description."
    );
  }

  if (a.version !== b.version) {
    reject(
      "DIFFERENT_RULESETS",
      "Reports use different assessment ruleset versions."
    );
  }

  if (a.metric !== b.metric) {
    reject(
      "DIFFERENT_METRICS",
      "Reports use different scoring metrics."
    );
  }

  if (a.timestamp === b.timestamp) {
    reject(
      "AMBIGUOUS_ORDER",
      "Both reports have the same recorded creation time."
    );
  }

  if (a.competencies.size !== b.competencies.size) {
    reject(
      "DIFFERENT_REQUIREMENTS",
      "Reports contain different assessed competencies."
    );
  }

  for (const [id, item] of a.competencies) {
    const other = b.competencies.get(id);

    if (!other) {
      reject(
        "DIFFERENT_REQUIREMENTS",
        "Reports have different competency identities."
      );
    }

    if (
      item.requirementType !== other.requirementType
    ) {
      reject(
        "CHANGED_IMPORTANCE",
        `Requirement importance changed for ${id}.`
      );
    }
  }
}

function summary(report) {
  return {
    reportId: report.id,
    resumeVersionId: report.resumeVersionId,
    resumeLabel: report.resumeLabel,
    createdAt: report.createdAt,
    score: report.score,
  };
}

/**
 * Compare two saved historical assessment snapshots.
 *
 * No database operations.
 * No scoring engine calls.
 * No mutation of input objects.
 */
function compareSavedReports(firstReport, secondReport) {
  const first = validateReport(firstReport);
  const second = validateReport(secondReport);

  checkCompatibility(first, second);

  const [earlier, later] =
    first.timestamp < second.timestamp
      ? [first, second]
      : [second, first];

  const strengthened = [];
  const weakened = [];
  const unchanged = [];

  const sortedIds = [
    ...earlier.competencies.keys(),
  ].sort();

  for (const id of sortedIds) {
    const before = earlier.competencies.get(id);
    const after = later.competencies.get(id);

    const delta =
      STATUS_RANK[after.status] -
      STATUS_RANK[before.status];

    const change = {
      canonicalSkillId: id,
      skill: before.name,
      requirementType: before.requirementType,
      before: before.status,
      after: after.status,
      evidenceLevelChange: delta,
    };

    if (delta > 0) {
      strengthened.push(change);
    } else if (delta < 0) {
      weakened.push(change);
    } else {
      unchanged.push(change);
    }
  }

  const scoreChange =
    earlier.score === null || later.score === null
      ? null
      : Math.round(
          (later.score - earlier.score) * 100
        ) / 100;

  return {
    comparable: true,
    targetType: earlier.targetType,
    targetKey: earlier.targetKey,
    assessmentVersion: earlier.version,
    metric: earlier.metric,

    earlier: summary(earlier),
    later: summary(later),

    coverage: {
      earlierScore: earlier.score,
      laterScore: later.score,
      changePercentagePoints: scoreChange,
    },

    competencies: {
      strengthened,
      weakened,
      unchanged,
    },

    counts: {
      strengthened: strengthened.length,
      weakened: weakened.length,
      unchanged: unchanged.length,
      total: sortedIds.length,
    },

    interpretation:
      "Changes describe resume evidence under the same " +
      "assessment rules, not verified skill growth or " +
      "hiring probability.",
  };
}

module.exports = {
  ComparisonError,
  compareSavedReports,
};
