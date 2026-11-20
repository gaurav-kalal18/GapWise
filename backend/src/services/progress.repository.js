
"use strict";

const { getDatabase } = require("../db/connection");

const {
  getReportById,
} = require("./report.repository");

/**
 * Load all full historical report snapshots
 * for one authenticated user.
 *
 * No pagination: progress timelines need
 * the entire saved assessment history.
 *
 * @param {string} userId
 * @param {object} db Optional test database
 * @returns {Array<object>}
 */
function listProgressReportsByUser(
  userId,
  db = getDatabase()
) {
  if (
    typeof userId !== "string" ||
    !userId.trim()
  ) {
    throw new TypeError(
      "A valid user ID is required."
    );
  }

  // Ownership filtering occurs in SQL.
  const rows = db.prepare(`
    SELECT id
    FROM analysis_reports
    WHERE user_id = ?
    ORDER BY created_at ASC, id ASC
  `).all(userId);

  // Reuse the existing saved-report snapshot mapper.
  // Every lookup remains scoped to the same user.
  return rows.map(({ id }) => {
    const report = getReportById(
      userId,
      id,
      db
    );

    if (!report) {
      throw new Error(
        "Unable to retrieve a saved report."
      );
    }

    return report;
  });
}

module.exports = {
  listProgressReportsByUser,
};
