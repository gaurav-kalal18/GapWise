
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

const { migrateDatabase } = require("../src/db/migrate");

const {
  registerUser,
  loginUser,
} = require("../src/services/auth.service");

const {
  getReportById,
} = require("../src/services/report.repository");

const {
  buildJobProfile,
} = require("../src/services/jd.assessment.service");

const {
  analyzeCandidateAgainstJob,
} = require("../src/services/analysis.service");

test(
  "report API enforces consent, ownership and persistence",
  { timeout: 30000 },
  async () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "gapwise-report-api-")
    );

    const databasePath = path.join(directory, "test.db");
    const previousPath = process.env.GAPWISE_DB_PATH;

    let server = null;

    try {
      process.env.GAPWISE_DB_PATH = databasePath;

      const db = getDatabase();
      migrateDatabase(db);

      // Create two fictional accounts.
      const alice = await registerUser({
        name: "Alice Tester",
        email: "alice-report@example.test",
        password: "AliceSecure#2026",
      });

      const bob = await registerUser({
        name: "Bob Tester",
        email: "bob-report@example.test",
        password: "BobSecure#2026",
      });

      const aliceSession = await loginUser({
        email: "alice-report@example.test",
        password: "AliceSecure#2026",
      });

      // Import the Express app without starting server.js.
      const app = require("../src/app");

      server = app.listen(0, "127.0.0.1");

      await new Promise((resolve, reject) => {
        if (server.listening) {
          resolve();
          return;
        }

        server.once("listening", resolve);
        server.once("error", reject);
      });

      const address = server.address();

      const url =
        `http://127.0.0.1:${address.port}/api/reports`;

      const jobProfile = buildJobProfile({
        title: "Junior Backend Developer",
        company: "Fictional Company",
        description:
          "Required Skills:\n" +
          "- Python\n" +
          "- SQL\n" +
          "Preferred Skills:\n" +
          "- Docker",
      });

      const candidateProfile = {
        skills: [
          { skill: "Python" },
        ],
        projects:
          "Built a Python API for a fictional college project.",
        experience: "",
        education: "",
        contact: "private-synthetic@example.test",
      };

      const payload = {
        resumeLabel: "Synthetic Resume v1",
        candidateProfile,
        jobProfile,
        saveConsent: true,

        // Deliberately malicious browser-supplied data.
        userId: bob.id,
        analysis: {
          readiness: {
            score: 999,
          },
        },
      };

      const baseHeaders = {
        "Content-Type": "application/json",
        "X-GapWise-Request": "1",
        Origin: "http://localhost:5173",
      };

      const cookie =
        `gapwise_session=${aliceSession.token}`;

      // 1. Guest cannot save a report.
      const guestResponse = await fetch(url, {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify(payload),
      });

      assert.equal(guestResponse.status, 401);

      console.log(
        "PASS: Unauthenticated save rejected."
      );

      // 2. An authenticated request needs consent.
      const noConsentResponse = await fetch(url, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Cookie: cookie,
        },
        body: JSON.stringify({
          ...payload,
          saveConsent: false,
        }),
      });

      assert.equal(noConsentResponse.status, 400);

      const beforeCount = db.prepare(`
        SELECT COUNT(*) AS total FROM analysis_reports
      `).get().total;

      assert.equal(beforeCount, 0);

      console.log(
        "PASS: Missing consent rejected without storage."
      );

      // 3. Reject an untrusted browser origin.
      const crossOriginResponse = await fetch(url, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Origin: "https://untrusted.example",
          Cookie: cookie,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(crossOriginResponse.status, 403);

      console.log(
        "PASS: Untrusted origin rejected."
      );

      // 4. Save a valid authenticated report.
      const saveResponse = await fetch(url, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Cookie: cookie,
        },
        body: JSON.stringify(payload),
      });

      const saved = await saveResponse.json();

      assert.equal(
        saveResponse.status,
        201,
        JSON.stringify(saved)
      );

      assert.ok(saved.reportId);
      assert.ok(saved.resumeVersionId);

      console.log(
        "PASS: Authenticated report saved."
      );

      // 5. Verify actual database ownership.
      const record = db.prepare(`
        SELECT user_id
        FROM analysis_reports
        WHERE id = ?
      `).get(saved.reportId);

      assert.equal(record.user_id, alice.id);
      assert.notEqual(record.user_id, bob.id);

      console.log(
        "PASS: Forged user ID ignored."
      );

      // 6. Verify the analysis was recalculated.
      const report = getReportById(
        alice.id,
        saved.reportId,
        db
      );

      assert.ok(report);

      const expectedAnalysis =
        analyzeCandidateAgainstJob(
          candidateProfile,
          jobProfile
        );

      assert.deepEqual(
        report.analysis,
        JSON.parse(JSON.stringify(expectedAnalysis))
      );

      assert.notEqual(
        report.analysis.readiness?.score,
        999
      );

      console.log(
        "PASS: Forged score ignored; server result stored."
      );

      // 7. Contact field should not be stored.
      assert.equal(
        Object.hasOwn(report.candidateProfile, "contact"),
        false
      );

      console.log(
        "PASS: Dedicated contact field excluded."
      );

      // 8. Repository enforces report ownership.
      assert.equal(
        getReportById(bob.id, saved.reportId, db),
        null
      );

      console.log(
        "PASS: Different account cannot retrieve report."
      );

      // 9. Both related records must exist.
      const resumeRecord = db.prepare(`
        SELECT id, user_id
        FROM resume_versions
        WHERE id = ?
      `).get(saved.resumeVersionId);

      assert.equal(resumeRecord.user_id, alice.id);

      console.log(
        "PASS: Report and resume version linked."
      );


// Test HTTP deletion using an additional synthetic report.
// Preserve the original report for the database reopening test.
const secondPayload = {
  ...payload,
  resumeLabel: "Synthetic Resume - Delete Test",
};

const secondSaveResponse = await fetch(url, {
  method: "POST",
  headers: {
    ...baseHeaders,
    Cookie: cookie,
  },
  body: JSON.stringify(secondPayload),
});

assert.equal(secondSaveResponse.status, 201);
const secondSaved = await secondSaveResponse.json();

const deleteUrl = `${url}/${secondSaved.reportId}`;

// Guest must not be able to delete.
const guestDelete = await fetch(deleteUrl, {
  method: "DELETE",
  headers: baseHeaders,
});

assert.equal(guestDelete.status, 401);

// Missing mutation header must be rejected.
const missingHeaderDelete = await fetch(deleteUrl, {
  method: "DELETE",
  headers: {
    "Content-Type": "application/json",
    Origin: "http://localhost:5173",
    Cookie: cookie,
  },
});

assert.equal(missingHeaderDelete.status, 403);

// Untrusted origin must be rejected.
const badOriginDelete = await fetch(deleteUrl, {
  method: "DELETE",
  headers: {
    ...baseHeaders,
    Origin: "https://untrusted.example",
    Cookie: cookie,
  },
});

assert.equal(badOriginDelete.status, 403);

// Bob must not be able to delete Alice's report.
const bobSession = await loginUser({
  email: "bob-report@example.test",
  password: "BobSecure#2026",
});

const bobDelete = await fetch(deleteUrl, {
  method: "DELETE",
  headers: {
    ...baseHeaders,
    Cookie: `gapwise_session=${bobSession.token}`,
  },
});

assert.equal(bobDelete.status, 404);

assert.ok(
  getReportById(alice.id, secondSaved.reportId, db)
);

// Invalid report IDs must be rejected.
const invalidDelete = await fetch(
  `${url}/not-a-valid-uuid`,
  {
    method: "DELETE",
    headers: {
      ...baseHeaders,
      Cookie: cookie,
    },
  }
);

assert.equal(invalidDelete.status, 400);

// The owner can delete the synthetic report.
const ownerDelete = await fetch(deleteUrl, {
  method: "DELETE",
  headers: {
    ...baseHeaders,
    Cookie: cookie,
  },
});

assert.equal(ownerDelete.status, 204);

// Both report and unused resume snapshot are gone.
assert.equal(
  getReportById(alice.id, secondSaved.reportId, db),
  null
);

const deletedResume = db.prepare(`
  SELECT id
  FROM resume_versions
  WHERE id = ?
`).get(secondSaved.resumeVersionId);

assert.equal(deletedResume, undefined);

// A second deletion should return 404.
const repeatedDelete = await fetch(deleteUrl, {
  method: "DELETE",
  headers: {
    ...baseHeaders,
    Cookie: cookie,
  },
});

assert.equal(repeatedDelete.status, 404);

// The original report remains available.
assert.ok(
  getReportById(alice.id, saved.reportId, db)
);

console.log(
  "PASS: Guest deletion blocked."
);

console.log(
  "PASS: Mutation and origin protections enforced."
);

console.log(
  "PASS: Cross-account deletion blocked."
);

console.log(
  "PASS: Invalid report ID rejected."
);

console.log(
  "PASS: Owner deleted report and unused resume snapshot."
);

console.log(
  "PASS: Original report preserved."
);

      // 10. Stop server and reopen the database.
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      server = null;
      closeDatabase();

      const reopenedDB = getDatabase();

      const persistedReport = getReportById(
        alice.id,
        saved.reportId,
        reopenedDB
      );

      assert.ok(persistedReport);
      assert.equal(
        persistedReport.id,
        saved.reportId
      );

      console.log(
        "PASS: Report survives database reopening."
      );

      console.log(
        "SUCCESS: Report API integration checks passed."
      );

    } finally {
      if (server) {
        await new Promise((resolve) => {
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
