
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { requireAuth } = require("../src/middleware/requireAuth");

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

    json(data) {
      this.body = data;
      return this;
    },
  };
}

test("requireAuth rejects requests without a session", () => {
  const req = { headers: {} };
  const res = mockResponse();

  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
  assert.equal(req.user, undefined);
});

test("requireAuth rejects malformed session cookies", () => {
  const req = {
    headers: {
      cookie: "gapwise_session=invalid-token",
    },
  };

  const res = mockResponse();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});
