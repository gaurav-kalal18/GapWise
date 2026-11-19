
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
} = require("../controllers/report.controller");

const router = express.Router();

router.post(
  "/reports",
  requireTrustedOrigin,
  requireCookieMutation,
  requireAuth,
  createReport
);

module.exports = router;