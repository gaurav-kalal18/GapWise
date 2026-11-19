
"use strict";

const { createHash } = require("node:crypto");

const {
  validateCandidate,
} = require("../middleware/request.validation");

const {
  analyzeCandidateAgainstJob,
} = require("../services/analysis.service");

const {
  saveAnalysisReport,
  listReportsByUser,
  getReportById,
  deleteReportById,
} = require("../services/report.repository");

function badRequest(message) {
  return Object.assign(new Error(message), {
    status: 400,
  });
}

function getTargetDetails(jobProfile) {
  const assessmentType = jobProfile.assessment?.type;

  if (assessmentType === "gapwise-role-rubric") {
    if (
      typeof jobProfile.roleId !== "string" ||
      !jobProfile.roleId.trim()
    ) {
      throw badRequest("A valid target role is required.");
    }

    return {
      targetType: "role",
      targetKey: jobProfile.roleId,
    };
  }

  if (assessmentType === "gapwise-custom-jd") {
    if (
      typeof jobProfile.description !== "string" ||
      !jobProfile.description.trim()
    ) {
      throw badRequest(
        "A job description is required."
      );
    }

    // A stable identifier helps compare later analyses
    // against the same job description.
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          title: jobProfile.title || "",
          company: jobProfile.company || "",
          description: jobProfile.description,
        })
      )
      .digest("hex");

    return {
      targetType: "jd",
      targetKey: `jd:${fingerprint}`,
    };
  }

  throw badRequest(
    "Only supported GapWise role and JD assessments can be saved."
  );
}

function createReport(req, res) {
  res.set("Cache-Control", "no-store");

  try {
    const body = req.body;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      throw badRequest("Invalid report request.");
    }

    if (body.saveConsent !== true) {
      throw badRequest(
        "Confirm that you want to save this analysis."
      );
    }

    const {
      candidateProfile,
      jobProfile,
      resumeLabel,
    } = body;

    if (
      typeof resumeLabel !== "string" ||
      !resumeLabel.trim() ||
      resumeLabel.trim().length > 150
    ) {
      throw badRequest("Invalid resume label.");
    }

    // Reuse the validation from the current
    // candidate-analysis endpoint.
    validateCandidate({
      candidateProfile,
      jobProfile,
    });

    const { targetType, targetKey } =
      getTargetDetails(jobProfile);

    // Never accept analysis, score, matches, gaps,
    // roadmap or userId supplied by the browser.
    const analysis = analyzeCandidateAgainstJob(
      candidateProfile,
      jobProfile
    );

    // Do not persist the dedicated contact field.
    // Other extracted resume sections may still
    // contain personal information.
    const {
      contact: _excludedContact,
      ...storedCandidateProfile
    } = candidateProfile;

    void _excludedContact;

    const saved = saveAnalysisReport({
      userId: req.user.id,
      resumeLabel: resumeLabel.trim(),
      candidateProfile: storedCandidateProfile,
      targetType,
      targetKey,
      targetProfile: jobProfile,
      analysis,
      assessmentVersion:
        analysis.assessmentVersion ||
        analysis.readiness?.evidenceRulesetVersion ||
        jobProfile.assessment?.version ||
        null,
    });

    return res.status(201).json({
      message: "Analysis report saved successfully.",
      reportId: saved.reportId,
      resumeVersionId: saved.resumeVersionId,
    });

  } catch (error) {
    if (
      error.status === 400 ||
      error.status === 404
    ) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    if (
      typeof error.message === "string" &&
      /assessment version mismatch/i.test(error.message)
    ) {
      return res.status(400).json({
        message:
          "Assessment version changed. Please analyze again.",
      });
    }

    console.error(
      "Report saving failed:",
      error.name
    );

    return res.status(500).json({
      message: "Unable to save analysis report.",
    });
  }
}


function listMyReports(req, res) {
  res.set("Cache-Control", "no-store");

  try {
    const pageText = req.query.page ?? "1";
    const limitText = req.query.limit ?? "20";

    // Strict parsing: reject values such as "2abc", decimals,
    // negative numbers and unexpectedly large parameters.
    if (
      typeof pageText !== "string" ||
      typeof limitText !== "string" ||
      !/^[1-9]\d{0,8}$/.test(pageText) ||
      !/^[1-9]\d{0,2}$/.test(limitText)
    ) {
      return res.status(400).json({
        message: "Invalid pagination parameters.",
      });
    }

    const page = Number(pageText);
    const limit = Number(limitText);

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      limit > 50
    ) {
      return res.status(400).json({
        message: "Invalid pagination parameters.",
      });
    }

    const result = listReportsByUser(
      req.user.id,
      { page, limit }
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Report history retrieval failed:",
      error.name
    );

    return res.status(500).json({
      message: "Unable to retrieve report history.",
    });
  }
}

function getMyReport(req, res) {
  res.set("Cache-Control", "no-store");

  try {
    const reportId = req.params.id;

    // Our report IDs are generated UUIDs.
    if (
      typeof reportId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(reportId)
    ) {
      return res.status(400).json({
        message: "Invalid report ID.",
      });
    }

    const report = getReportById(
      req.user.id,
      reportId
    );

    if (!report) {
      // Deliberately use the same response for an unknown
      // report and another user's report.
      return res.status(404).json({
        message: "Report not found.",
      });
    }

    return res.status(200).json({
      report,
    });
  } catch (error) {
    console.error(
      "Saved report retrieval failed:",
      error.name
    );

    return res.status(500).json({
      message: "Unable to retrieve report.",
    });
  }
}


/**
 * DELETE /api/reports/:id
 *
 * Permanently deletes a report belonging to
 * the authenticated user.
 */
function deleteMyReport(req, res) {
  res.set("Cache-Control", "no-store");

  try {
    const reportId = req.params.id;

    // Validate the UUID before accessing the database.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      typeof reportId !== "string" ||
      !uuidPattern.test(reportId)
    ) {
      return res.status(400).json({
        message: "Invalid report ID.",
      });
    }

    // User identity is taken ONLY from the
    // authenticated server-side session.
    const deleted = deleteReportById(
      req.user.id,
      reportId
    );

    if (!deleted) {
      // Same response for unknown and other-user reports.
      return res.status(404).json({
        message: "Report not found.",
      });
    }

    // Successful permanent deletion.
    return res.status(204).end();

  } catch (error) {
    console.error(
      "Report deletion failed:",
      error.name
    );

    return res.status(500).json({
      message: "Unable to delete report.",
    });
  }
}


module.exports = {
  createReport,
  listMyReports,
  getMyReport,
  deleteMyReport,
};
