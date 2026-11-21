
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRateLimiter,
} = require("../src/middleware/auth.rateLimit");

function mockResponse() {
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

test("allows requests within the configured limit", () => {
  const limiter = createRateLimiter({
    windowMs: 1000,
    maxRequests: 2,
  });

  for (let i = 0; i < 2; i++) {
    const req = { ip: "127.0.0.1" };
    const res = mockResponse();

    let allowed = false;

    limiter(req, res, () => {
      allowed = true;
    });

    assert.equal(allowed, true);
    assert.equal(res.statusCode, 200);
  }
});

test("blocks requests exceeding the limit", () => {
  const limiter = createRateLimiter({
    windowMs: 1000,
    maxRequests: 2,
  });

  const req = { ip: "127.0.0.1" };

  limiter(req, mockResponse(), () => {});
  limiter(req, mockResponse(), () => {});

  const res = mockResponse();
  let allowed = false;

  limiter(req, res, () => {
    allowed = true;
  });

  assert.equal(allowed, false);
  assert.equal(res.statusCode, 429);
  assert.ok(Number(res.headers["Retry-After"]) > 0);
});

test("resets the limit after its time window", () => {
  let time = 1000;

  const limiter = createRateLimiter({
    windowMs: 1000,
    maxRequests: 1,
    now: () => time,
  });

  const req = { ip: "127.0.0.1" };

  limiter(req, mockResponse(), () => {});

  const blocked = mockResponse();
  limiter(req, blocked, () => {});

  assert.equal(blocked.statusCode, 429);

  time = 2000;

  let allowed = false;

  limiter(req, mockResponse(), () => {
    allowed = true;
  });

  assert.equal(allowed, true);
});

test("tracks different IP addresses separately", () => {
  const limiter = createRateLimiter({
    windowMs: 1000,
    maxRequests: 1,
  });

  limiter({ ip: "127.0.0.1" }, mockResponse(), () => {});

  let secondAllowed = false;

  limiter(
    { ip: "127.0.0.2" },
    mockResponse(),
    () => { secondAllowed = true; }
  );

  assert.equal(secondAllowed, true);
});
