
"use strict";

/**
 * Candidate sections permitted in saved reports.
 *
 * Contact details and unexpected properties are not
 * persisted in the candidate snapshot.
 *
 * This does not anonymize free-text resume evidence.
 */
const STORED_CANDIDATE_FIELDS = Object.freeze([
  "skills",
  "projects",
  "experience",
  "education",
  "achievements",
  "coursework",
  "codingProfiles",
  "positions",
  "other",
]);

function sanitizeCandidateForStorage(candidateProfile) {
  if (
    !candidateProfile ||
    typeof candidateProfile !== "object" ||
    Array.isArray(candidateProfile)
  ) {
    throw new TypeError(
      "A valid candidate profile is required."
    );
  }

  const stored = {};

  for (const field of STORED_CANDIDATE_FIELDS) {
    if (
      Object.prototype.hasOwnProperty.call(
        candidateProfile,
        field
      )
    ) {
      stored[field] = candidateProfile[field];
    }
  }

  return stored;
}

module.exports = {
  STORED_CANDIDATE_FIELDS,
  sanitizeCandidateForStorage,
};
