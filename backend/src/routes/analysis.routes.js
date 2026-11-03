const express = require("express");

const {
    analyzeSkills,
    analyzeCandidate,
    getSkillTaxonomy
} = require("../controllers/analysis.controller");

const router = express.Router();

router.post("/analysis", analyzeSkills);

router.post(
    "/analysis/candidate",
    analyzeCandidate
);

router.get("/skills", getSkillTaxonomy);

module.exports = router;