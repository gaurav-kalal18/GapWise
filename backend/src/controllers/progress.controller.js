
"use strict";

const {
  listProgressReportsByUser,
} = require("../services/progress.repository");

const {
  aggregateProgress,
  ProgressError,
} = require("../services/progress.service");

/**
 * GET /api/progress
 *
 * Returns historical assessment timelines
 * belonging to the authenticated user.
 */
function getMyProgress(req, res) {
  res.set("Cache-Control", "no-store");

  try {
    // Never accept userId from a query parameter.
    const userId = req.user.id;

    const savedReports =
      listProgressReportsByUser(userId);

    const progress =
      aggregateProgress(savedReports);

    return res.status(200).json({
      message: "Progress history retrieved.",
      progress,
    });

  } catch (error) {
    if (error instanceof ProgressError) {
      // Do not expose detailed stored resume content
      // or internal analysis data in error responses.
      console.error(
        "Progress data validation failed:",
        error.code
      );

      return res.status(422).json({
        message:
          "Some saved assessments cannot be " +
          "included in a valid progress timeline.",
        code: error.code,
      });
    }

    console.error(
      "Progress retrieval failed:",
      error.name
    );

    return res.status(500).json({
      message:
        "Unable to retrieve progress history.",
    });
  }
}

module.exports = {
  getMyProgress,
};
