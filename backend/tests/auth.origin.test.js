
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  requireTrustedOrigin,
  requireCookieMutation,
} = require("../src/middleware/request.origin");

function response() {
  return {
    statusCode: 200,
    body: null,

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

function request(headers = {}) {
  return {
    get(name) {
      return headers[name.toLowerCase()];
    },
  };
}

function check(middleware, headers) {
  const req = request(headers);
  const res = response();
  let allowed = false;

  middleware(req, res, () => {
    allowed = true;
  });

  return {
    allowed,
    status: res.statusCode,
  };
}

test("trusted frontend origin is allowed", () => {
  const result = check(requireTrustedOrigin, {
    origin: "http://localhost:5173",
  });

  assert.equal(result.allowed, true);
});

test("untrusted origin is rejected", () => {
  const result = check(requireTrustedOrigin, {
    origin: "https://untrusted.example",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
});

test("cross-site browser requests are rejected", () => {
  const result = check(requireTrustedOrigin, {
    "sec-fetch-site": "cross-site",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
});

test("headerless local CLI requests are allowed", () => {
  const result = check(requireTrustedOrigin, {});

  assert.equal(result.allowed, true);
});

test("authenticated mutation without header is blocked", () => {
  const result = check(requireCookieMutation, {});

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
});

test("authenticated mutation with header is allowed", () => {
  const result = check(requireCookieMutation, {
    "x-gapwise-request": "1",
  });

  assert.equal(result.allowed, true);
});
