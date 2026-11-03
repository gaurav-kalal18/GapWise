const {
    matchSkills
} = require("../services/matching.service");

const {
    skillTaxonomy
} = require("../services/skill.taxonomy");

const {
    prioritizeGaps
} = require("../services/priority.service");

const {
    analyzeCandidateAgainstJob
} = require("../services/analysis.service");


const analyzeSkills = (req, res) => {

    const {
        candidateSkills = [],
        requiredSkills = []
    } = req.body;

    const result = matchSkills(
        candidateSkills,
        requiredSkills
    );

    const prioritizedGaps =
        prioritizeGaps(result.gaps);

    res.json({
        message: "Skill analysis completed",

        analysis: {
            matches: result.matches,
            gaps: prioritizedGaps
        }
    });
};


const analyzeCandidate = (req, res) => {

    const {
        candidateProfile,
        jobProfile
    } = req.body;

    if (!candidateProfile) {
        return res.status(400).json({
            message: "Candidate profile is required"
        });
    }

    if (!jobProfile) {
        return res.status(400).json({
            message: "Job profile is required"
        });
    }

    const analysis =
        analyzeCandidateAgainstJob(
            candidateProfile,
            jobProfile
        );

    res.json({
        message: "Candidate-job analysis completed",

        analysis
    });
};


const getSkillTaxonomy = (req, res) => {
    res.json(skillTaxonomy);
};


module.exports = {
    analyzeSkills,
    analyzeCandidate,
    getSkillTaxonomy
};