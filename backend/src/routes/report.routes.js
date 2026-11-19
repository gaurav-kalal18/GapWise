
"use strict";

const express = require("express");

const {
  requireAuth,
} = require("../middleware/requireAuth");

const {
  requireTrustedOrigin,
  requireCookieMutation,
} = require("../middleware/request.origin");

const {
  createReport,
  listMyReports,
  getMyReport,
  deleteMyReport,
  compareMyReports,
} = require("../controllers/report.controller");

const router = express.Router();

// Save an authenticated analysis.
router.post(
  "/reports",
  requireTrustedOrigin,
  requireCookieMutation,
  requireAuth,
  createReport
);

// List reports owned by the signed-in user.
router.get(
  "/reports",
  requireAuth,
  listMyReports
);

// IMPORTANT: Register this before /reports/:id.
// Otherwise Express could interpret "compare" as an ID.
router.get(
  "/reports/compare",
  requireAuth,
  compareMyReports
);

// Retrieve a complete historical report.
router.get(
  "/reports/:id",
  requireAuth,
  getMyReport
);

// Permanently delete an owned report.
router.delete(
  "/reports/:id",
  requireTrustedOrigin,
  requireCookieMutation,
  requireAuth,
  deleteMyReport
);

module.exports = router;
