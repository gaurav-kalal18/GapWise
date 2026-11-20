
"use strict";

/**
 * GapWise historical progress aggregation.
 *
 * Input: Full saved-report snapshots belonging to one user.
 * Output: Target-specific, compatibility-safe timelines.
 *
 * This service does not read/write SQLite and does not
 * run resume analysis or scoring.
 */

const VALID_STATUSES = new Set([
  "not_demonstrated",
  "partial",
  "demonstrated",
]);

const VALID_REQUIREMENT_TYPES = new Set([
  "required",
  "preferred",
]);

class ProgressError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProgressError";
    this.code = code;
    this.status = 422;
  }
}

function fail(code, message) {
  throw new ProgressError(code, message);
}

function isNonEmpty(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function parseTimestamp(value) {
  if (!isNonEmpty(value)) {
    fail(
      "INVALID_TIMESTAMP",
      "A saved report has no creation timestamp."
    );
  }

  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
      ? `${value.replace(" ", "T")}Z`
      : value;

  const time = Date.parse(normalized);

  if (!Number.isFinite(time)) {
    fail(
      "INVALID_TIMESTAMP",
      "A saved report has an invalid timestamp."
    );
  }

  return time;
}

function getAssessmentVersion(report) {
  const candidates = [
    report.assessmentVersion,
    report.analysis?.assessmentVersion,
    report.analysis?.readiness?.evidenceRulesetVersion,
    report.targetProfile?.assessment?.version,
  ].filter(isNonEmpty);

  if (candidates.length === 0) {
    fail(
      "MISSING_VERSION",
      "A saved report has no assessment version."
    );
  }

  if (new Set(candidates).size !== 1) {
    fail(
      "INCONSISTENT_VERSION",
      "A saved report has conflicting assessment versions."
    );
  }

  return candidates[0];
}

function getMetric(report) {
  const metric = report.analysis?.readiness?.metric;

  if (!isNonEmpty(metric)) {
    fail(
      "MISSING_METRIC",
      "A saved report is missing its scoring metric."
    );
  }

  return metric;
}

function getScore(report) {
  const readiness = report.analysis?.readiness;

  if (
    !readiness ||
    !Object.prototype.hasOwnProperty.call(
      readiness,
      "score"
    )
  ) {
    fail(
      "MISSING_SCORE",
      "A saved report is missing its score field."
    );
  }

  const score = readiness.score;

  if (score === null) {
    return null;
  }

  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    fail(
      "INVALID_SCORE",
      "A saved report has an invalid coverage score."
    );
  }

  return score;
}

/**
 * Build a stable requirement signature.
 *
 * Identical target/version alone is insufficient:
 * criteria and their required/preferred importance must
 * match before points can share a timeline.
 */
function getRequirementSignature(report) {
  const matches = report.analysis?.matches;
  const gaps = report.analysis?.gaps;

  if (
    !Array.isArray(matches) ||
    !Array.isArray(gaps)
  ) {
    fail(
      "INVALID_ANALYSIS",
      "A saved report is missing competency results."
    );
  }

  const items = [...matches, ...gaps];

  if (items.length === 0) {
    fail(
      "EMPTY_ASSESSMENT",
      "A saved report has no assessed competencies."
    );
  }

  const seen = new Set();
  const requirements = [];

  for (const item of items) {
    if (!isNonEmpty(item?.canonicalSkillId)) {
      fail(
        "MISSING_COMPETENCY_ID",
        "A competency has no canonical ID."
      );
    }

    const id = item.canonicalSkillId.trim();

    if (seen.has(id)) {
      fail(
        "DUPLICATE_COMPETENCY",
        `Duplicate competency: ${id}`
      );
    }

    seen.add(id);

    if (
      !VALID_REQUIREMENT_TYPES.has(
        item.requirementType
      )
    ) {
      fail(
        "INVALID_IMPORTANCE",
        `Invalid requirement type for ${id}.`
      );
    }

    if (!VALID_STATUSES.has(item.evidenceStatus)) {
      fail(
        "INVALID_EVIDENCE_STATUS",
        `Invalid evidence status for ${id}.`
      );
    }

    if (
      (item.evidenceStatus === "demonstrated") !==
      (item.satisfiesRequirement === true)
    ) {
      fail(
        "INCONSISTENT_EVIDENCE",
        `Inconsistent evidence for ${id}.`
      );
    }

    requirements.push([
      id,
      item.requirementType,
    ]);
  }

  requirements.sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return {
    signature: JSON.stringify(requirements),
    requirementCount: requirements.length,
    requiredCount: requirements.filter(
      ([, type]) => type === "required"
    ).length,
  };
}

function normalizeReport(report) {
  if (
    !report ||
    typeof report !== "object" ||
    !isNonEmpty(report.id) ||
    !isNonEmpty(report.userId) ||
    !["role", "jd"].includes(report.targetType) ||
    !isNonEmpty(report.targetKey)
  ) {
    fail(
      "INVALID_REPORT",
      "Saved report identity is incomplete."
    );
  }

  const {
    signature,
    requirementCount,
    requiredCount,
  } = getRequirementSignature(report);

  const assessmentVersion =
    getAssessmentVersion(report);

  const metric = getMetric(report);
  const score = getScore(report);
  const timestamp = parseTimestamp(report.createdAt);

  const targetName =
    report.targetProfile?.title ||
    report.targetProfile?.roleTitle ||
    report.targetKey;

  return {
    id: report.id,
    userId: report.userId,
    resumeVersionId:
      report.resumeVersionId || null,
    resumeLabel:
      report.resumeLabel || "Untitled resume",
    targetType: report.targetType,
    targetKey: report.targetKey,
    targetName,
    assessmentVersion,
    metric,
    requirementSignature: signature,
    requirementCount,
    requiredCount,
    createdAt: report.createdAt,
    timestamp,
    score,
  };
}

function roundDelta(value) {
  return Math.round(value * 100) / 100;
}

function buildTimeline(reports, index) {
  const sorted = [...reports].sort(
    (a, b) =>
      a.timestamp - b.timestamp ||
      a.id.localeCompare(b.id)
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const points = sorted.map((report, position) => {
    const previous = sorted[position - 1];

    const canCalculateChange =
      previous &&
      previous.timestamp !== report.timestamp &&
      previous.score !== null &&
      report.score !== null;

    return {
      reportId: report.id,
      resumeVersionId: report.resumeVersionId,
      resumeLabel: report.resumeLabel,
      createdAt: report.createdAt,
      score: report.score,
      changeFromPreviousPercentagePoints:
        canCalculateChange
          ? roundDelta(
              report.score - previous.score
            )
          : null,
    };
  });

  const hasUnambiguousEndpoints =
    first.id === last.id ||
    first.timestamp !== last.timestamp;

  const netChange =
    first.id !== last.id &&
    hasUnambiguousEndpoints &&
    first.score !== null &&
    last.score !== null
      ? roundDelta(last.score - first.score)
      : null;

  return {
    id: `series-${index}`,
    targetType: first.targetType,
    targetKey: first.targetKey,
    targetName: first.targetName,
    assessmentVersion: first.assessmentVersion,
    metric: first.metric,
    requirementCount: first.requirementCount,
    requiredCount: first.requiredCount,
    reportCount: sorted.length,
    scoredReportCount: sorted.filter(
      report => report.score !== null
    ).length,
    firstScore: first.score,
    latestScore: last.score,
    netChangePercentagePoints: netChange,
    firstCreatedAt: first.createdAt,
    lastCreatedAt: last.createdAt,
    points,
  };
}

/**
 * @param {Array<object>} savedReports
 * Full saved report objects from getReportById().
 *
 * All reports must belong to the same authenticated user.
 * Authentication and SQL ownership checks belong in the
 * future controller/repository layer.
 */
function aggregateProgress(savedReports) {
  if (!Array.isArray(savedReports)) {
    fail(
      "INVALID_INPUT",
      "Progress requires an array of saved reports."
    );
  }

  if (savedReports.length === 0) {
    return {
      totalReports: 0,
      totalTargets: 0,
      totalSeries: 0,
      timelines: [],
    };
  }

  const normalized = savedReports.map(
    normalizeReport
  );

  const userId = normalized[0].userId;
  const reportIds = new Set();

  for (const report of normalized) {
    if (report.userId !== userId) {
      fail(
        "DIFFERENT_USERS",
        "Progress cannot combine different users."
      );
    }

    if (reportIds.has(report.id)) {
      fail(
        "DUPLICATE_REPORT",
        "Progress received a duplicate report."
      );
    }

    reportIds.add(report.id);
  }

  // Group by target AND exact assessment compatibility.
  const groups = new Map();

  for (const report of normalized) {
    const key = JSON.stringify([
      report.targetType,
      report.targetKey,
      report.assessmentVersion,
      report.metric,
      report.requirementSignature,
    ]);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(report);
  }

  const orderedGroups = [...groups.values()].sort(
    (a, b) => {
      const latestA = Math.max(
        ...a.map(item => item.timestamp)
      );
      const latestB = Math.max(
        ...b.map(item => item.timestamp)
      );

      return (
        latestB - latestA ||
        a[0].targetKey.localeCompare(
          b[0].targetKey
        )
      );
    }
  );

  const timelines = orderedGroups.map(
    (reports, index) =>
      buildTimeline(reports, index + 1)
  );

  const targetKeys = new Set(
    normalized.map(report =>
      JSON.stringify([
        report.targetType,
        report.targetKey,
      ])
    )
  );

  return {
    totalReports: normalized.length,
    totalTargets: targetKeys.size,
    totalSeries: timelines.length,
    timelines,
  };
}

module.exports = {
  ProgressError,
  aggregateProgress,
};
