
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  STORED_CANDIDATE_FIELDS,
  sanitizeCandidateForStorage,
} = require("../src/services/candidate.storage.service");

test("preserves supported resume evidence", () => {
  const profile = {
    skills: ["JavaScript", "React"],
    projects: "Built a React dashboard.",
    experience: "Backend development internship.",
    education: "B.Tech CSE",
    achievements: "Won a coding contest.",
    coursework: "Operating Systems, DBMS",
    codingProfiles: "Codeforces",
    positions: "Technical lead",
    other: "Open-source contributor",
  };

  const stored = sanitizeCandidateForStorage(profile);

  assert.deepEqual(stored, profile);
});

test("excludes dedicated contact and unknown properties", () => {
  const profile = {
    skills: ["JavaScript"],
    projects: "Built a Node.js application.",
    contact: "person@example.test",
    password: "NotForStorage123!",
    sessionToken: "example-secret",
    metadata: {
      phone: "1234567890",
    },
  };

  const stored = sanitizeCandidateForStorage(profile);

  assert.deepEqual(stored, {
    skills: ["JavaScript"],
    projects: "Built a Node.js application.",
  });

  assert.equal(
    Object.hasOwn(stored, "contact"),
    false
  );

  assert.equal(
    Object.hasOwn(stored, "password"),
    false
  );

  assert.equal(
    Object.hasOwn(stored, "metadata"),
    false
  );
});

test("does not mutate original candidate profile", () => {
  const profile = {
    skills: ["Python"],
    contact: "person@example.test",
  };

  const before = structuredClone(profile);

  sanitizeCandidateForStorage(profile);

  assert.deepEqual(profile, before);
});

test("rejects invalid candidate profiles", () => {
  for (const input of [
    null,
    undefined,
    [],
    "resume",
    42,
  ]) {
    assert.throws(
      () => sanitizeCandidateForStorage(input),
      TypeError
    );
  }
});

test("allowlist does not contain contact", () => {
  assert.equal(
    STORED_CANDIDATE_FIELDS.includes("contact"),
    false
  );
});

test("preserves empty recognized sections", () => {
  const stored = sanitizeCandidateForStorage({
    skills: [],
    projects: "",
    experience: "",
    contact: "",
  });

  assert.deepEqual(stored, {
    skills: [],
    projects: "",
    experience: "",
  });
});

test("retains free-text evidence without pretending to anonymize it", () => {
  const description =
    "Built a portfolio at example@example.test";

  const stored = sanitizeCandidateForStorage({
    projects: description,
    contact: "example@example.test",
  });

  assert.equal(stored.projects, description);
  assert.equal(
    Object.hasOwn(stored, "contact"),
    false
  );
});