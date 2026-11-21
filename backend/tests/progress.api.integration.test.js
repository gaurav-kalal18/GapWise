
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

const METRIC = "required_resume_evidence_coverage";

function requirement(
  id,
  status,
  importance = "required"
) {
  return {
    canonicalSkillId: id,
    skill: id,
    evidenceStatus: status,
    requirementType: importance,
    satisfiesRequirement: status === "demonstrated",
  };
}

function fixture({
  userId,
  targetType = "role",
  targetKey = "backend-developer",
  title = "Backend Developer",
  version = "progress-test-v1",
  score = 50,
  label = "Test Resume",
  items = [
    requirement("api", "partial"),
    requirement("database", "demonstrated"),
    requirement("git", "partial", "preferred"),
  ],
}) {
  return {
    userId,
    resumeLabel: label,

    candidateProfile: {
      skills: [],
      projects: "Synthetic testing evidence.",
    },

    targetType,
    targetKey,

    targetProfile: {
      title,
      assessment: { version },
    },

    assessmentVersion: version,

    analysis: {
      assessmentVersion: version,
      readiness: {
        metric: METRIC,
        score,
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

function getUserId(result) {
  return result?.id ?? result?.user?.id;
}

function getSessionToken(result) {
  return (
    result?.token ??
    result?.sessionToken ??
    result?.rawToken
  );
}

function saveReport(db, data, timestamp) {
  const saved = saveAnalysisReport(
    fixture(data),
    db
  );

  const id = saved?.reportId ?? saved?.id;

  if (!id) {
    throw new Error(
      "Saved report did not return an ID."
    );
  }

  // Only adjust timestamps inside the temporary test DB.
  db.prepare(`
    UPDATE analysis_reports
    SET created_at = ?
    WHERE id = ?
  `).run(timestamp, id);

  return id;
}

test(
  "GET /api/progress: ownership, grouping, chronology and immutability",
  { timeout: 30000 },
  async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "gapwise-progress-api-")
    );

    const originalDbPath =
      process.env.GAPWISE_DB_PATH;

    process.env.GAPWISE_DB_PATH =
      path.join(tempDir, "test.db");

    let server;

    try {
      const db = getDatabase();
      migrateDatabase(db);

      // Create three fictional accounts.
      const alice = await registerUser({
        name: "Alice Progress",
        email: "alice-progress@example.test",
        password: "AliceProgress#2026",
      });

      const bob = await registerUser({
        name: "Bob Progress",
        email: "bob-progress@example.test",
        password: "BobProgress#2026",
      });

      const charlie = await registerUser({
        name: "Charlie Progress",
        email: "charlie-progress@example.test",
        password: "CharlieProgress#2026",
      });

      const aliceId = getUserId(alice);
      const bobId = getUserId(bob);

      assert.ok(aliceId);
      assert.ok(bobId);
      assert.ok(getUserId(charlie));

      const aliceLogin = await loginUser({
        email: "alice-progress@example.test",
        password: "AliceProgress#2026",
      });

      const bobLogin = await loginUser({
        email: "bob-progress@example.test",
        password: "BobProgress#2026",
      });

      const charlieLogin = await loginUser({
        email: "charlie-progress@example.test",
        password: "CharlieProgress#2026",
      });

      const aliceToken = getSessionToken(aliceLogin);
      const bobToken = getSessionToken(bobLogin);
      const charlieToken = getSessionToken(charlieLogin);

      assert.ok(aliceToken, "Alice token missing");
      assert.ok(bobToken, "Bob token missing");
      assert.ok(charlieToken, "Charlie token missing");

      // Alice: 2 comparable Backend Developer reports.
      const aliceFirstId = saveReport(
        db,
        {
          userId: aliceId,
          score: 50,
          label: "Backend Resume V1",
        },
        "2026-11-18 10:00:00"
      );

      const aliceSecondId = saveReport(
        db,
        {
          userId: aliceId,
          score: 0,
          label: "Writer Resume Tested Against Backend",
          items: [
            requirement("api", "not_demonstrated"),
            requirement("database", "not_demonstrated"),
            requirement("git", "not_demonstrated", "preferred"),
          ],
        },
        "2026-11-19 10:00:00"
      );

      // Alice: same target, new ruleset -> separate timeline.
      const differentVersionId = saveReport(
        db,
        {
          userId: aliceId,
          score: 60,
          version: "progress-test-v2",
          label: "Backend New Rubric",
        },
        "2026-11-20 09:00:00"
      );

      // Alice: different role -> separate target.
      const frontendId = saveReport(
        db,
        {
          userId: aliceId,
          targetKey: "frontend-developer",
          title: "Frontend Developer",
          score: 75,
          label: "Frontend Resume",
        },
        "2026-11-20 10:00:00"
      );

      // Alice: custom JD with unknown overall score.
      const jdId = saveReport(
        db,
        {
          userId: aliceId,
          targetType: "jd",
          targetKey: "jd:synthetic-fingerprint",
          title: "Custom Job Description",
          score: null,
          label: "Custom JD Resume",
        },
        "2026-11-20 11:00:00"
      );

      // Bob: report that Alice must never receive.
      const bobReportId = saveReport(
        db,
        {
          userId: bobId,
          score: 90,
          label: "Bob Private Resume",
        },
        "2026-11-20 12:00:00"
      );

      // Charlie deliberately has no saved reports.

      const appExport = require("../src/app");
      const app = appExport.app || appExport;

      server = app.listen(0, "127.0.0.1");

      await new Promise((resolve, reject) => {
        if (server.listening) return resolve();

        server.once("listening", resolve);
        server.once("error", reject);
      });

      const baseUrl =
        `http://127.0.0.1:${server.address().port}` +
        "/api/progress";

      async function getProgress(token, query = "") {
        const response = await fetch(baseUrl + query, {
          headers: token
            ? {
                Cookie: `gapwise_session=${token}`,
              }
            : {},
        });

        let body = {};

        try {
          body = await response.json();
        } catch {
          // The status assertion will explain failures.
        }

        return {
          status: response.status,
          body,
        };
      }

      // Snapshot stored rows before any API requests.
      const before = db.prepare(`
        SELECT *
        FROM analysis_reports
        ORDER BY id
      `).all();

      const resumeCountBefore = db.prepare(`
        SELECT COUNT(*) AS count
        FROM resume_versions
      `).get().count;

      // TEST 1: Guests cannot access progress.
      const guest = await getProgress();

      assert.equal(guest.status, 401);

      console.log(
        "PASS: Guest access rejected."
      );

      // TEST 2: Alice receives only her own reports.
      const aliceProgress = await getProgress(aliceToken);

      assert.equal(
        aliceProgress.status,
        200,
        JSON.stringify(aliceProgress.body)
      );

      const aliceData = aliceProgress.body.progress;

      assert.equal(aliceData.totalReports, 5);
      assert.equal(aliceData.totalTargets, 3);
      assert.equal(aliceData.totalSeries, 4);

      const aliceReportIds = new Set(
        aliceData.timelines.flatMap(
          timeline =>
            timeline.points.map(point => point.reportId)
        )
      );

      assert.equal(aliceReportIds.size, 5);

      for (const id of [
        aliceFirstId,
        aliceSecondId,
        differentVersionId,
        frontendId,
        jdId,
      ]) {
        assert.ok(
          aliceReportIds.has(id),
          `Missing Alice report ${id}`
        );
      }

      assert.equal(
        aliceReportIds.has(bobReportId),
        false
      );

      console.log(
        "PASS: Alice sees only her five reports."
      );

      // TEST 3: Compatible Backend timeline.
      const backendTimeline = aliceData.timelines.find(
        timeline =>
          timeline.targetKey === "backend-developer" &&
          timeline.assessmentVersion === "progress-test-v1"
      );

      assert.ok(
        backendTimeline,
        "Missing compatible Backend Developer timeline."
      );

      assert.equal(backendTimeline.reportCount, 2);
      assert.equal(backendTimeline.firstScore, 50);
      assert.equal(backendTimeline.latestScore, 0);

      assert.equal(
        backendTimeline.netChangePercentagePoints,
        -50
      );

      assert.deepEqual(
        backendTimeline.points.map(
          point => point.reportId
        ),
        [aliceFirstId, aliceSecondId]
      );

      console.log(
        "PASS: Timeline chronology and -50 pp change."
      );

      // TEST 4: New rubric creates a different timeline.
      const backendSeries = aliceData.timelines.filter(
        timeline =>
          timeline.targetKey === "backend-developer"
      );

      assert.equal(backendSeries.length, 2);

      assert.ok(
        backendSeries.some(
          timeline =>
            timeline.assessmentVersion ===
            "progress-test-v2"
        )
      );

      console.log(
        "PASS: Different rulesets separated."
      );

      // TEST 5: Different roles and JDs separated.
      assert.ok(
        aliceData.timelines.some(
          timeline =>
            timeline.targetKey === "frontend-developer"
        )
      );

      const jdTimeline = aliceData.timelines.find(
        timeline =>
          timeline.targetKey ===
          "jd:synthetic-fingerprint"
      );

      assert.ok(jdTimeline);
      assert.equal(jdTimeline.latestScore, null);
      assert.equal(jdTimeline.scoredReportCount, 0);

      console.log(
        "PASS: Roles and JDs separated; null score preserved."
      );

      // TEST 6: User query parameters cannot switch accounts.
      const attemptedOverride = await getProgress(
        aliceToken,
        `?userId=${encodeURIComponent(bobId)}`
      );

      assert.equal(attemptedOverride.status, 200);
      assert.equal(
        attemptedOverride.body.progress.totalReports,
        5
      );

      console.log(
        "PASS: Client cannot override authenticated user."
      );

      // TEST 7: Bob receives only Bob's report.
      const bobProgress = await getProgress(bobToken);

      assert.equal(bobProgress.status, 200);
      assert.equal(
        bobProgress.body.progress.totalReports,
        1
      );

      assert.equal(
        bobProgress.body.progress.timelines[0]
          .points[0].reportId,
        bobReportId
      );

      console.log(
        "PASS: Bob's progress is isolated."
      );

      // TEST 8: Empty history is valid.
      const charlieProgress = await getProgress(
        charlieToken
      );

      assert.equal(charlieProgress.status, 200);

      assert.deepEqual(
        charlieProgress.body.progress,
        {
          totalReports: 0,
          totalTargets: 0,
          totalSeries: 0,
          timelines: [],
        }
      );

      console.log(
        "PASS: Empty history returns empty timelines."
      );

      // TEST 9: Progress is read-only.
      const after = db.prepare(`
        SELECT *
        FROM analysis_reports
        ORDER BY id
      `).all();

      const resumeCountAfter = db.prepare(`
        SELECT COUNT(*) AS count
        FROM resume_versions
      `).get().count;

      assert.deepEqual(after, before);
      assert.equal(
        resumeCountAfter,
        resumeCountBefore
      );

      console.log(
        "PASS: All stored reports remain unchanged."
      );

    } finally {
      if (server) {
        await new Promise(resolve =>
          server.close(resolve)
        );
      }

      closeDatabase();

      if (originalDbPath === undefined) {
        delete process.env.GAPWISE_DB_PATH;
      } else {
        process.env.GAPWISE_DB_PATH = originalDbPath;
      }

      fs.rmSync(tempDir, {
        recursive: true,
        force: true,
      });
    }
  }
);
