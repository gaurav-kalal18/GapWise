
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  saveAnalysisReport,
  getReportById,
  listReportsByUser,
  deleteReportById,
} = require("../src/services/report.repository");
const { migrateDatabase } = require("../src/db/migrate");

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



test("lists only reports owned by the requested user", () => {
  withDatabase((db) => {
    const alice = createUser(
      db,
      "history-alice@example.test"
    );

    const bob = createUser(
      db,
      "history-bob@example.test"
    );

    saveAnalysisReport(exampleReport(alice), db);
    saveAnalysisReport(exampleReport(alice), db);
    saveAnalysisReport(exampleReport(bob), db);

    const aliceHistory = listReportsByUser(
      alice,
      {},
      db
    );

    assert.equal(aliceHistory.reports.length, 2);
    assert.equal(aliceHistory.pagination.total, 2);

    const bobHistory = listReportsByUser(
      bob,
      {},
      db
    );

    assert.equal(bobHistory.reports.length, 1);
    assert.equal(bobHistory.pagination.total, 1);
  });
});

test("history supports pagination", () => {
  withDatabase((db) => {
    const userId = createUser(
      db,
      "pagination@example.test"
    );

    for (let i = 0; i < 5; i++) {
      saveAnalysisReport(exampleReport(userId), db);
    }

    const first = listReportsByUser(
      userId,
      { page: 1, limit: 2 },
      db
    );

    const second = listReportsByUser(
      userId,
      { page: 2, limit: 2 },
      db
    );

    assert.equal(first.reports.length, 2);
    assert.equal(second.reports.length, 2);

    assert.equal(first.pagination.total, 5);
    assert.equal(first.pagination.totalPages, 3);

    const firstIds = new Set(
      first.reports.map(report => report.id)
    );

    assert.ok(
      second.reports.every(
        report => !firstIds.has(report.id)
      )
    );
  });
});

test("history returns summaries without resume evidence", () => {
  withDatabase((db) => {
    const userId = createUser(
      db,
      "summary@example.test"
    );

    saveAnalysisReport(exampleReport(userId), db);

    const result = listReportsByUser(userId, {}, db);
    const report = result.reports[0];

    assert.equal(
      report.targetName,
      "Software Engineer"
    );

    assert.equal(report.score, null);

    assert.equal(
      Object.hasOwn(report, "candidateProfile"),
      false
    );

    assert.equal(
      Object.hasOwn(report, "analysis"),
      false
    );
  });
});

test("history rejects invalid pagination", () => {
  withDatabase((db) => {
    assert.throws(
      () => listReportsByUser(
        "test-user",
        { page: 0, limit: 20 },
        db
      ),
      /pagination/
    );

    assert.throws(
      () => listReportsByUser(
        "test-user",
        { page: 1, limit: 1000 },
        db
      ),
      /pagination/
    );
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


test("owner can delete a saved report", () => {
  withDatabase((db) => {
    const userId = createUser(
      db,
      "delete-owner@example.test"
    );

    const saved = saveAnalysisReport(
      exampleReport(userId),
      db
    );

    const deleted = deleteReportById(
      userId,
      saved.reportId,
      db
    );

    assert.equal(deleted, true);

    assert.equal(
      getReportById(userId, saved.reportId, db),
      null
    );

    const resume = db.prepare(`
      SELECT id
      FROM resume_versions
      WHERE id = ?
    `).get(saved.resumeVersionId);

    assert.equal(resume, undefined);
  });
});

test("one user cannot delete another user's report", () => {
  withDatabase((db) => {
    const alice = createUser(
      db,
      "delete-alice@example.test"
    );

    const bob = createUser(
      db,
      "delete-bob@example.test"
    );

    const saved = saveAnalysisReport(
      exampleReport(alice),
      db
    );

    assert.equal(
      deleteReportById(bob, saved.reportId, db),
      false
    );

    assert.ok(
      getReportById(alice, saved.reportId, db)
    );
  });
});

test("deleting an unknown report is safe", () => {
  withDatabase((db) => {
    const userId = createUser(
      db,
      "delete-missing@example.test"
    );

    assert.equal(
      deleteReportById(
        userId,
        randomUUID(),
        db
      ),
      false
    );

    assert.equal(
      db.prepare(`
        SELECT COUNT(*) AS total
        FROM analysis_reports
      `).get().total,
      0
    );
  });
});

test("deleting one report preserves other reports", () => {
  withDatabase((db) => {
    const userId = createUser(
      db,
      "delete-preserve@example.test"
    );

    const first = saveAnalysisReport(
      exampleReport(userId),
      db
    );

    const second = saveAnalysisReport(
      exampleReport(userId),
      db
    );

    assert.equal(
      deleteReportById(
        userId,
        first.reportId,
        db
      ),
      true
    );

    assert.equal(
      getReportById(userId, first.reportId, db),
      null
    );

    assert.ok(
      getReportById(userId, second.reportId, db)
    );

    const count = db.prepare(`
      SELECT COUNT(*) AS total
      FROM analysis_reports
    `).get().total;

    assert.equal(count, 1);
  });
});