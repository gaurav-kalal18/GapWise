
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const { migrateDatabase } = require("../src/db/migrate");
const {
  saveAnalysisReport,
  getReportById,
} = require("../src/services/report.repository");

function withDatabase(fn) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "gapwise-report-test-")
  );

  const db = new Database(path.join(dir, "test.db"));

  try {
    db.pragma("foreign_keys = ON");
    migrateDatabase(db);
    return fn(db);
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createUser(db, email) {
  const id = randomUUID();

  // No actual login takes place in these storage tests.
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash)
    VALUES (?, ?, ?, ?)
  `).run(id, "Test User", email, "synthetic-placeholder");

  return id;
}

function exampleReport(userId) {
  return {
    userId,
    resumeLabel: "Resume Version 1",
    candidateProfile: {
      skills: [{ skill: "JavaScript" }],
      projects: [],
    },
    targetType: "role",
    targetKey: "software-engineer",
    targetProfile: {
      title: "Software Engineer",
      requiredSkills: [],
    },
    analysis: {
      matches: [],
      gaps: [{ skill: "Debugging" }],
      readiness: {
        metric: "resume_evidence_coverage",
        value: 40,
      },
      roadmap: [],
    },
    assessmentVersion: "test-ruleset-v1",
  };
}

test("saves resume and report together", () => {
  withDatabase((db) => {
    const userId = createUser(
      db,
      "first@example.test"
    );

    const result = saveAnalysisReport(
      exampleReport(userId),
      db
    );

    assert.ok(result.reportId);
    assert.ok(result.resumeVersionId);

    const resumeCount = db.prepare(
      "SELECT COUNT(*) AS count FROM resume_versions"
    ).get().count;

    const reportCount = db.prepare(
      "SELECT COUNT(*) AS count FROM analysis_reports"
    ).get().count;

    assert.equal(resumeCount, 1);
    assert.equal(reportCount, 1);
  });
});

test("saved report can be retrieved with original data", () => {
  withDatabase((db) => {
    const userId = createUser(
      db,
      "second@example.test"
    );

    const input = exampleReport(userId);

    const saved = saveAnalysisReport(input, db);

    const retrieved = getReportById(
      userId,
      saved.reportId,
      db
    );

    assert.equal(retrieved.resumeLabel, input.resumeLabel);
    assert.equal(retrieved.targetType, "role");
    assert.deepEqual(
      retrieved.analysis,
      input.analysis
    );
    assert.deepEqual(
      retrieved.candidateProfile,
      input.candidateProfile
    );
  });
});

test("one user cannot retrieve another user's report", () => {
  withDatabase((db) => {
    const alice = createUser(
      db,
      "alice@example.test"
    );

    const bob = createUser(
      db,
      "bob@example.test"
    );

    const saved = saveAnalysisReport(
      exampleReport(alice),
      db
    );

    assert.ok(
      getReportById(alice, saved.reportId, db)
    );

    assert.equal(
      getReportById(bob, saved.reportId, db),
      null
    );
  });
});

test("failed report insert rolls back resume insert", () => {
  withDatabase((db) => {
    const userId = createUser(
      db,
      "rollback@example.test"
    );

    // Simulate a database error during report insertion.
    db.exec(`
      CREATE TRIGGER reject_test_report
      BEFORE INSERT ON analysis_reports
      BEGIN
        SELECT RAISE(ABORT, 'Simulated report failure');
      END;
    `);

    assert.throws(
      () => saveAnalysisReport(exampleReport(userId), db),
      /Simulated report failure/
    );

    const resumeCount = db.prepare(
      "SELECT COUNT(*) AS count FROM resume_versions"
    ).get().count;

    const reportCount = db.prepare(
      "SELECT COUNT(*) AS count FROM analysis_reports"
    ).get().count;

    assert.equal(resumeCount, 0);
    assert.equal(reportCount, 0);
  });
});

test("rejects saving for a nonexistent account", () => {
  withDatabase((db) => {
    assert.throws(
      () => saveAnalysisReport(
        exampleReport(randomUUID()),
        db
      ),
      /Account not found/
    );
  });
});
