
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
} = require("../controllers/report.controller");

const router = express.Router();

// CREATE: Save a new analysis.
router.post(
  "/reports",
  requireTrustedOrigin,
  requireCookieMutation,
  requireAuth,
  createReport
);

// READ: List reports owned by the logged-in user.
router.get(
  "/reports",
  requireAuth,
  listMyReports
);

// READ: Retrieve one historical report.
router.get(
  "/reports/:id",
  requireAuth,
  getMyReport
);

// DELETE: Permanently delete an owned report.
router.delete(
  "/reports/:id",
  requireTrustedOrigin,
  requireCookieMutation,
  requireAuth,
  deleteMyReport
);

module.exports = router;
