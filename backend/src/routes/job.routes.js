const express = require("express");

const {
    createJob,
    analyzeJobDescription
} = require("../controllers/job.controller");

const router = express.Router();

router.post("/jobs", createJob);

router.post(
    "/jobs/analyze",
    analyzeJobDescription
);

module.exports = router;