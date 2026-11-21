
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRateLimiter,
} = require("../src/middleware/auth.rateLimit");

const {
  requireTrustedOrigin,
  requireCookieMutation,
} = require("../src/middleware/request.origin");

const {
  readSessionCookie,
} = require("../src/middleware/session.cookie");

const {
  hashPassword,
  verifyPassword,
  validatePassword,
} = require("../src/services/password.service");

// Simple Express response mock.
function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,

    set(name, value) {
      this.headers[name] = value;
      return this;
    },

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },
  };
}

// Simulates an HTTP request for middleware tests.
function createRequest({
  ip = "127.0.0.1",
  headers = {},
} = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(
      ([key, value]) => [
        key.toLowerCase(),
        value,
      ]
    )
  );

  return {
    ip,
    socket: { remoteAddress: ip },
    headers: normalized,

    get(name) {
      return normalized[name.toLowerCase()];
    },
  };
}

function invoke(middleware, req) {
  const res = createResponse();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { res, nextCalled };
}

test("rejects password shorter than 12 characters", () => {
  assert.throws(
    () => validatePassword("short123"),
    /12/
  );
});

test("valid password hashes and verifies", async () => {
  const password = "TestPassword#2026";

  const hash = await hashPassword(password);

  assert.ok(hash.startsWith("scrypt$"));

  assert.equal(
    await verifyPassword(password, hash),
    true
  );

  assert.equal(
    await verifyPassword("WrongPassword123!", hash),
    false
  );

  assert.equal(
    hash.includes(password),
    false
  );
});

test("different salts generate different hashes", async () => {
  const password = "TestPassword#2026";

  const first = await hashPassword(password);
  const second = await hashPassword(password);

  assert.notEqual(first, second);
});

test("missing mutation header is rejected", () => {
  const result = invoke(
    requireCookieMutation,
    createRequest()
  );

  assert.equal(result.res.statusCode, 403);
  assert.equal(result.nextCalled, false);
});

test("correct mutation header is accepted", () => {
  const result = invoke(
    requireCookieMutation,
    createRequest({
      headers: {
        "X-GapWise-Request": "1",
      },
    })
  );

  assert.equal(result.nextCalled, true);
});

test("untrusted origin is rejected", () => {
  const result = invoke(
    requireTrustedOrigin,
    createRequest({
      headers: {
        Origin: "https://untrusted.example",
      },
    })
  );

  assert.equal(result.res.statusCode, 403);
  assert.equal(result.nextCalled, false);
});

test("cross-site fetch metadata is rejected", () => {
  const result = invoke(
    requireTrustedOrigin,
    createRequest({
      headers: {
        "Sec-Fetch-Site": "cross-site",
      },
    })
  );

  assert.equal(result.res.statusCode, 403);
  assert.equal(result.nextCalled, false);
});

test("trusted localhost origin is accepted", () => {
  const result = invoke(
    requireTrustedOrigin,
    createRequest({
      headers: {
        Origin: "http://localhost:5173",
      },
    })
  );

  assert.equal(result.nextCalled, true);
});

test("rate limiter blocks requests over limit", () => {
  let clock = 1000;

  const limiter = createRateLimiter({
    windowMs: 60000,
    maxRequests: 2,
    now: () => clock,
  });

  const req = createRequest({
    ip: "192.0.2.10",
  });

  assert.equal(invoke(limiter, req).nextCalled, true);
  assert.equal(invoke(limiter, req).nextCalled, true);

  const blocked = invoke(limiter, req);

  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.nextCalled, false);
  assert.ok(blocked.res.headers["Retry-After"]);

  clock += 60001;

  assert.equal(invoke(limiter, req).nextCalled, true);
});

test("rate limiter isolates different IPs", () => {
  const limiter = createRateLimiter({
    windowMs: 60000,
    maxRequests: 1,
  });

  const first = createRequest({
    ip: "192.0.2.10",
  });

  const second = createRequest({
    ip: "192.0.2.11",
  });

  assert.equal(invoke(limiter, first).nextCalled, true);
  assert.equal(invoke(limiter, first).res.statusCode, 429);
  assert.equal(invoke(limiter, second).nextCalled, true);
});

test("invalid or missing session cookies are rejected", () => {
  assert.equal(
    readSessionCookie(createRequest()),
    null
  );

  assert.equal(
    readSessionCookie(
      createRequest({
        headers: {
          Cookie: "gapwise_session=invalid",
        },
      })
    ),
    null
  );
});

test("validly formatted session token is extracted", () => {
  const token = "a".repeat(64);

  const result = readSessionCookie(
    createRequest({
      headers: {
        Cookie: `other=value; gapwise_session=${token}`,
      },
    })
  );

  assert.equal(result, token);
});
