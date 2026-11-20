
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

const migrationsDir = path.join(
  __dirname,
  "../src/db/migrations"
);

function readMigration(filename) {
  return fs.readFileSync(
    path.join(migrationsDir, filename),
    "utf8"
  );
}

test("report/resume ownership migration preserves data and rejects mismatches", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "gapwise-ownership-")
  );

  const dbPath = path.join(tempDir, "ownership.db");
  let db;

  try {
    db = new Database(dbPath);
    db.pragma("foreign_keys = ON");

    db.exec(
      readMigration("001_initial_schema.sql")
    );

    const insertUser = db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash
      )
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run(
      "alice", "Alice", "alice@example.test", "test-hash"
    );

    insertUser.run(
      "bob", "Bob", "bob@example.test", "test-hash"
    );

    const insertResume = db.prepare(`
      INSERT INTO resume_versions (
        id, user_id, label, candidate_snapshot_json
      )
      VALUES (?, ?, ?, ?)
    `);

    insertResume.run(
      "resume-alice", "alice", "Alice Resume", "{}"
    );

    insertResume.run(
      "resume-bob", "bob", "Bob Resume", "{}"
    );

    const insertReport = db.prepare(`
      INSERT INTO analysis_reports (
        id,
        user_id,
        resume_version_id,
        target_type,
        target_key,
        target_snapshot_json,
        analysis_snapshot_json
      )
      VALUES (?, ?, ?, 'role', ?, '{}', '{}')
    `);

    insertReport.run(
      "report-alice",
      "alice",
      "resume-alice",
      "backend-developer"
    );

    const before = db.prepare(`
      SELECT *
      FROM analysis_reports
      WHERE id = 'report-alice'
    `).get();

    // Apply the new migration to the existing populated DB.
    db.exec(
      readMigration(
        "002_enforce_report_resume_ownership.sql"
      )
    );

    // Migration must not modify existing reports.
    const after = db.prepare(`
      SELECT *
      FROM analysis_reports
      WHERE id = 'report-alice'
    `).get();

    assert.deepEqual(after, before);

    // A valid same-owner insert remains possible.
    insertReport.run(
      "report-bob",
      "bob",
      "resume-bob",
      "frontend-developer"
    );

    // A cross-account insert must fail.
    assert.throws(
      () => insertReport.run(
        "invalid-cross-user",
        "alice",
        "resume-bob",
        "backend-developer"
      ),
      /same owner/
    );

    // Reassigning a report's resume to another user fails.
    assert.throws(
      () => db.prepare(`
        UPDATE analysis_reports
        SET resume_version_id = ?
        WHERE id = ?
      `).run("resume-bob", "report-alice"),
      /same owner/
    );

    // Changing the report owner independently also fails.
    assert.throws(
      () => db.prepare(`
        UPDATE analysis_reports
        SET user_id = ?
        WHERE id = ?
      `).run("bob", "report-alice"),
      /same owner/
    );

    // Moving an already referenced resume to another
    // account must fail too.
    assert.throws(
      () => db.prepare(`
        UPDATE resume_versions
        SET user_id = ?
        WHERE id = ?
      `).run("bob", "resume-alice"),
      /Cannot change owner/
    );

    // A valid deletion continues to work.
    const deleted = db.prepare(`
      DELETE FROM analysis_reports
      WHERE id = ? AND user_id = ?
    `).run("report-bob", "bob");

    assert.equal(deleted.changes, 1);

    // Deleting Bob's now-unused resume is allowed.
    const removedResume = db.prepare(`
      DELETE FROM resume_versions
      WHERE id = ? AND user_id = ?
    `).run("resume-bob", "bob");

    assert.equal(removedResume.changes, 1);

    assert.equal(
      db.pragma("integrity_check", { simple: true }),
      "ok"
    );

    assert.equal(
      db.pragma("foreign_key_check").length,
      0
    );

  } finally {
    if (db?.open) db.close();

    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
});
