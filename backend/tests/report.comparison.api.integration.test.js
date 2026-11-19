
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  getDatabase,
  closeDatabase,
} = require("../src/db/connection");

const {
  migrateDatabase,
} = require("../src/db/migrate");

const {
  registerUser,
  loginUser,
} = require("../src/services/auth.service");

const {
  saveAnalysisReport,
} = require("../src/services/report.repository");

const VERSION = "comparison-test-v1";

function criterion(id, status, importance = "required") {
  return {
    canonicalSkillId: id,
    skill: id,
    requirementType: importance,
    evidenceStatus: status,
    satisfiesRequirement: status === "demonstrated",
  };
}

function makeSnapshot({
  userId,
  targetType = "role",
  targetKey = "role:backend-developer",
  version = VERSION,
  resumeLabel = "Synthetic Resume",
  score = 50,
  items,
}) {
  const competencies = items || [
    criterion("backend:api", "partial"),
    criterion("backend:sql", "demonstrated"),
    criterion("backend:git", "partial", "preferred"),
  ];

  return {
    userId,
    resumeLabel,
    candidateProfile: {
      skills: [],
      projects: "Synthetic project evidence.",
    },
    targetType,
    targetKey,
    targetProfile: {
      title: targetType === "jd"
        ? "Synthetic JD"
        : "Backend Developer",
      assessment: {
        type: targetType === "jd"
          ? "gapwise-custom-jd"
          : "gapwise-role-rubric",
        version,
      },
    },
    analysis: {
      assessmentVersion: version,
      readiness: {
        score,
        metric: "required_resume_evidence_coverage",
        evidenceRulesetVersion: version,
      },
      matches: competencies.filter(
        item => item.satisfiesRequirement
      ),
      gaps: competencies.filter(
        item => !item.satisfiesRequirement
      ),
    },
    assessmentVersion: version,
  };
}

function saveFixture(db, options, timestamp) {
  const saved = saveAnalysisReport(
    makeSnapshot(options),
    db
  );

  // Test-only timestamps ensure unambiguous chronology.
  // No real database records are modified.
  db.prepare(`
    UPDATE analysis_reports
    SET created_at = ?
    WHERE id = ?
  `).run(timestamp, saved.reportId);

  return saved.reportId;
}

test(
  "comparison API enforces compatibility and ownership",
  { timeout: 30000 },
  async () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "gapwise-compare-api-")
    );

    const previousPath = process.env.GAPWISE_DB_PATH;
    process.env.GAPWISE_DB_PATH =
      path.join(directory, "comparison.db");

    let server;

    try {
      const db = getDatabase();
      migrateDatabase(db);

      const alice = await registerUser({
        name: "Alice Comparison",
        email: "alice-compare@example.test",
        password: "AliceCompare#2026",
      });

      const bob = await registerUser({
        name: "Bob Comparison",
        email: "bob-compare@example.test",
        password: "BobCompare#2026",
      });

      const aliceSession = await loginUser({
        email: "alice-compare@example.test",
        password: "AliceCompare#2026",
      });

      const bobSession = await loginUser({
        email: "bob-compare@example.test",
        password: "BobCompare#2026",
      });

      const earlierId = saveFixture(
        db,
        {
          userId: alice.id,
          resumeLabel: "Backend Resume V1",
          score: 50,
        },
        "2026-11-18 10:00:00"
      );

      const laterId = saveFixture(
        db,
        {
          userId: alice.id,
          resumeLabel: "Backend Resume V2",
          score: 100,
          items: [
            criterion("backend:api", "demonstrated"),
            criterion("backend:sql", "demonstrated"),
            criterion("backend:git", "partial", "preferred"),
          ],
        },
        "2026-11-19 10:00:00"
      );

      const bobReportId = saveFixture(
        db,
        { userId: bob.id },
        "2026-11-20 10:00:00"
      );

      const otherRoleId = saveFixture(
        db,
        {
          userId: alice.id,
          targetKey: "role:data-scientist",
        },
        "2026-11-20 11:00:00"
      );

      const otherVersionId = saveFixture(
        db,
        {
          userId: alice.id,
          version: "comparison-test-v2",
        },
        "2026-11-20 12:00:00"
      );

      const jdFirstId = saveFixture(
        db,
        {
          userId: alice.id,
          targetType: "jd",
          targetKey: "jd:synthetic-first",
        },
        "2026-11-18 13:00:00"
      );

      const jdSecondId = saveFixture(
        db,
        {
          userId: alice.id,
          targetType: "jd",
          targetKey: "jd:synthetic-second",
        },
        "2026-11-19 13:00:00"
      );

      const app = require("../src/app");

      server = app.listen(0, "127.0.0.1");

      await new Promise((resolve, reject) => {
        if (server.listening) return resolve();
        server.once("listening", resolve);
        server.once("error", reject);
      });

      const address = server.address();

      const baseUrl =
        `http://127.0.0.1:${address.port}` +
        "/api/reports/compare";

      function request(first, second, token) {
        const params = new URLSearchParams();

        if (first !== undefined) {
          params.set("first", first);
        }

        if (second !== undefined) {
          params.set("second", second);
        }

        const url = `${baseUrl}?${params}`;

        return fetch(url, {
          headers: token
            ? {
                Cookie: `gapwise_session=${token}`,
              }
            : {},
        });
      }

      // Snapshot database contents before comparison.
      const before = db.prepare(`
        SELECT
          id,
          target_snapshot_json,
          analysis_snapshot_json
        FROM analysis_reports
        ORDER BY id
      `).all();

      // 1. Successful comparison.
      const successResponse = await request(
        earlierId,
        laterId,
        aliceSession.token
      );

      const success = await successResponse.json();

      assert.equal(
        successResponse.status,
        200,
        JSON.stringify(success)
      );

      assert.equal(
        success.comparison.comparable,
        true
      );

      assert.equal(
        success.comparison.coverage.changePercentagePoints,
        50
      );

      assert.equal(
        success.comparison.counts.strengthened,
        1
      );

      assert.equal(
        success.comparison.counts.unchanged,
        2
      );

      assert.equal(
        success.comparison.earlier.reportId,
        earlierId
      );

      assert.equal(
        success.comparison.later.reportId,
        laterId
      );

      console.log(
        "PASS: Compatible historical reports compared."
      );

      // 2. Argument order must not affect chronology.
      const reverseResponse = await request(
        laterId,
        earlierId,
        aliceSession.token
      );

      const reverse = await reverseResponse.json();

      assert.equal(reverseResponse.status, 200);

      assert.equal(
        reverse.comparison.earlier.reportId,
        earlierId
      );

      console.log(
        "PASS: Chronology preserved."
      );

      // 3. Guests cannot compare.
      const guestResponse = await request(
        earlierId,
        laterId
      );

      assert.equal(guestResponse.status, 401);

      console.log(
        "PASS: Unauthenticated comparison rejected."
      );

      // 4. Malformed ID.
      const invalidResponse = await request(
        "invalid-id",
        laterId,
        aliceSession.token
      );

      assert.equal(invalidResponse.status, 400);

      // 5. Same report twice.
      const identicalResponse = await request(
        earlierId,
        earlierId,
        aliceSession.token
      );

      assert.equal(identicalResponse.status, 400);

      console.log(
        "PASS: Invalid and identical IDs rejected."
      );

      // 6. Alice cannot access Bob's report.
      const crossAccountResponse = await request(
        earlierId,
        bobReportId,
        aliceSession.token
      );

      assert.equal(crossAccountResponse.status, 404);

      // Bob cannot compare Alice's reports either.
      const reverseOwnerResponse = await request(
        earlierId,
        laterId,
        bobSession.token
      );

      assert.equal(reverseOwnerResponse.status, 404);

      console.log(
        "PASS: Cross-account access blocked."
      );

      // 7. Different roles are incompatible.
      const roleResponse = await request(
        earlierId,
        otherRoleId,
        aliceSession.token
      );

      const roleResult = await roleResponse.json();

      assert.equal(roleResponse.status, 422);
      assert.equal(
        roleResult.code,
        "DIFFERENT_TARGETS"
      );

      console.log(
        "PASS: Different target roles rejected."
      );

      // 8. Different JD fingerprints.
      const jdResponse = await request(
        jdFirstId,
        jdSecondId,
        aliceSession.token
      );

      const jdResult = await jdResponse.json();

      assert.equal(jdResponse.status, 422);
      assert.equal(
        jdResult.code,
        "DIFFERENT_TARGETS"
      );

      console.log(
        "PASS: Different JD fingerprints rejected."
      );

      // 9. Different rulesets.
      const versionResponse = await request(
        earlierId,
        otherVersionId,
        aliceSession.token
      );

      const versionResult = await versionResponse.json();

      assert.equal(versionResponse.status, 422);
      assert.equal(
        versionResult.code,
        "DIFFERENT_RULESETS"
      );

      console.log(
        "PASS: Different rulesets rejected."
      );

      // 10. Comparisons must not modify stored snapshots.
      const after = db.prepare(`
        SELECT
          id,
          target_snapshot_json,
          analysis_snapshot_json
        FROM analysis_reports
        ORDER BY id
      `).all();

      assert.deepEqual(after, before);

      console.log(
        "PASS: Historical snapshots remain unchanged."
      );

    } finally {
      if (server) {
        await new Promise(resolve => {
          server.close(() => resolve());
        });
      }

      closeDatabase();

      if (previousPath === undefined) {
        delete process.env.GAPWISE_DB_PATH;
      } else {
        process.env.GAPWISE_DB_PATH = previousPath;
      }

      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  }
);
