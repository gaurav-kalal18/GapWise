
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("authentication sessions and identity isolation", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "gapwise-auth-integration-")
  );

  const originalPath = process.env.GAPWISE_DB_PATH;
  process.env.GAPWISE_DB_PATH = path.join(directory, "test.db");

  // Import after configuring the isolated database.
  const { getDatabase, closeDatabase } =
    require("../src/db/connection");
  const { migrateDatabase } =
    require("../src/db/migrate");
  const {
    registerUser,
    loginUser,
    getSessionUser,
    revokeSession,
    hashSessionToken,
  } = require("../src/services/auth.service");
  const { requireAuth } =
    require("../src/middleware/requireAuth");

  const mockResponse = () => ({
    statusCode: 200,
    body: null,
    set() { return this; },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  });

  try {
    const db = getDatabase();
    migrateDatabase(db);

    const alice = await registerUser({
      name: "Alice Test",
      email: "alice@example.test",
      password: "AlicePassword#2026",
    });

    const bob = await registerUser({
      name: "Bob Test",
      email: "bob@example.test",
      password: "BobPassword#2026",
    });

    const aliceLogin = await loginUser({
      email: "alice@example.test",
      password: "AlicePassword#2026",
    });

    const bobLogin = await loginUser({
      email: "bob@example.test",
      password: "BobPassword#2026",
    });

    // Test 1: Session restoration.
    assert.equal(
      getSessionUser(aliceLogin.token).id,
      alice.id
    );

    console.log("PASS: Valid session restores correct user.");

    // Test 2: Middleware accepts valid session.
    const request = {
      headers: {
        cookie: `gapwise_session=${aliceLogin.token}`,
      },
    };

    const response = mockResponse();
    let nextCalled = false;

    requireAuth(request, response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(request.user.id, alice.id);

    console.log("PASS: Authenticated middleware access.");

    // Test 3: A token cannot impersonate another user.
    assert.notEqual(alice.id, bob.id);
    assert.equal(
      getSessionUser(bobLogin.token).id,
      bob.id
    );

    assert.equal(
      getSessionUser(aliceLogin.token).id,
      alice.id
    );

    console.log("PASS: Session identity isolation.");

    // Test 4: Revocation invalidates session.
    assert.equal(revokeSession(aliceLogin.token), true);
    assert.equal(getSessionUser(aliceLogin.token), null);

    console.log("PASS: Revoked session rejected.");

    // Test 5: Expired sessions are rejected.
    db.prepare(
      "UPDATE sessions SET expires_at = ? WHERE token_hash = ?"
    ).run(
      "2020-01-01T00:00:00.000Z",
      hashSessionToken(bobLogin.token)
    );

    assert.equal(getSessionUser(bobLogin.token), null);

    console.log("PASS: Expired session rejected.");
    console.log("SUCCESS: Authentication integration test passed.");

  } finally {
    closeDatabase();

    if (originalPath === undefined) {
      delete process.env.GAPWISE_DB_PATH;
    } else {
      process.env.GAPWISE_DB_PATH = originalPath;
    }

    fs.rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
});
