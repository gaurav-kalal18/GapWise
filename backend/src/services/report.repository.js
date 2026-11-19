
"use strict";

const { randomUUID } = require("node:crypto");
const { getDatabase } = require("../db/connection");

const MAX_SNAPSHOT_BYTES = 1024 * 1024;

function invalid(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function serializeSnapshot(value, field) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw invalid(`${field} must be an object.`);
  }

  let json;

  try {
    json = JSON.stringify(value);
  } catch {
    throw invalid(`${field} cannot be serialized.`);
  }

  if (
    !json ||
    Buffer.byteLength(json, "utf8") > MAX_SNAPSHOT_BYTES
  ) {
    throw invalid(`${field} exceeds the storage limit.`);
  }

  return json;
}

function requiredText(value, field, maxLength = 150) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    throw invalid(`Invalid ${field}.`);
  }

  return value.trim();
}

/**
 * Save a candidate snapshot and an analysis report atomically.
 *
 * IMPORTANT:
 * This is an internal persistence function.
 * The future HTTP controller must calculate the analysis on
 * the backend and take userId from the authenticated session.
 */
function saveAnalysisReport(input, db = getDatabase()) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw invalid("Invalid report data.");
  }

  const {
    userId,
    resumeLabel,
    candidateProfile,
    targetType,
    targetKey = null,
    targetProfile,
    analysis,
    assessmentVersion = null,
  } = input;

  const safeUserId = requiredText(userId, "user ID", 100);
  const safeLabel = requiredText(
    resumeLabel,
    "resume label",
    150
  );

  if (!["role", "jd"].includes(targetType)) {
    throw invalid("Target type must be role or jd.");
  }

  if (
    targetKey !== null &&
    (typeof targetKey !== "string" ||
      targetKey.length > 200)
  ) {
    throw invalid("Invalid target key.");
  }

  if (
    assessmentVersion !== null &&
    (typeof assessmentVersion !== "string" ||
      assessmentVersion.length > 120)
  ) {
    throw invalid("Invalid assessment version.");
  }

  const candidateJSON = serializeSnapshot(
    candidateProfile,
    "Candidate profile"
  );

  const targetJSON = serializeSnapshot(
    targetProfile,
    "Target profile"
  );

  const analysisJSON = serializeSnapshot(
    analysis,
    "Analysis"
  );

  const resumeVersionId = randomUUID();
  const reportId = randomUUID();

  const transaction = db.transaction(() => {
    // Verify ownership against an existing account.
    const owner = db.prepare(
      "SELECT id FROM users WHERE id = ?"
    ).get(safeUserId);

    if (!owner) {
      throw Object.assign(
        new Error("Account not found."),
        { status: 404 }
      );
    }

    db.prepare(`
      INSERT INTO resume_versions (
        id,
        user_id,
        label,
        candidate_snapshot_json
      )
      VALUES (?, ?, ?, ?)
    `).run(
      resumeVersionId,
      safeUserId,
      safeLabel,
      candidateJSON
    );

    db.prepare(`
      INSERT INTO analysis_reports (
        id,
        user_id,
        resume_version_id,
        target_type,
        target_key,
        target_snapshot_json,
        analysis_snapshot_json,
        assessment_version
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      safeUserId,
      resumeVersionId,
      targetType,
      targetKey,
      targetJSON,
      analysisJSON,
      assessmentVersion
    );

    return {
      reportId,
      resumeVersionId,
    };
  });

  return transaction();
}

/**
 * Read a report only when it belongs to the supplied user.
 * Later, userId must come from req.user.id, never from
 * a query string or browser-supplied request body.
 */
function getReportById(userId, reportId, db = getDatabase()) {
  if (
    typeof userId !== "string" ||
    typeof reportId !== "string"
  ) {
    return null;
  }

  const record = db.prepare(`
    SELECT
      r.id,
      r.user_id,
      r.resume_version_id,
      r.target_type,
      r.target_key,
      r.target_snapshot_json,
      r.analysis_snapshot_json,
      r.assessment_version,
      r.created_at,
      v.label AS resume_label,
      v.candidate_snapshot_json
    FROM analysis_reports AS r
    JOIN resume_versions AS v
      ON v.id = r.resume_version_id
      AND v.user_id = r.user_id
    WHERE r.id = ?
      AND r.user_id = ?
  `).get(reportId, userId);

  if (!record) return null;

  return {
    id: record.id,
    userId: record.user_id,
    resumeVersionId: record.resume_version_id,
    resumeLabel: record.resume_label,
    targetType: record.target_type,
    targetKey: record.target_key,
    assessmentVersion: record.assessment_version,
    createdAt: record.created_at,
    candidateProfile: JSON.parse(
      record.candidate_snapshot_json
    ),
    targetProfile: JSON.parse(
      record.target_snapshot_json
    ),
    analysis: JSON.parse(
      record.analysis_snapshot_json
    ),
  };
}

module.exports = {
  saveAnalysisReport,
  getReportById,
};
