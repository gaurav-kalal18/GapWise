const { normalizeSkill } = require("../services/skill.service");
const { buildJobProfile } = require("../services/job.service");


const createJob = (req, res) => {
    const {
        title,
        company,
        requiredSkills = []
    } = req.body;

    const normalizedSkills = requiredSkills.map((item) => {

        // Support simple string format
        if (typeof item === "string") {
            return {
                skill: normalizeSkill(item),
                requirementType: "required"
            };
        }

        // Support detailed requirement format
        return {
            skill: normalizeSkill(item.skill),
            requirementType: item.requirementType || "required"
        };
    });

    const job = {
        title,
        company,
        requiredSkills: normalizedSkills
    };

    res.status(201).json({
        message: "Target job received successfully",
        job: job
    });
};


const analyzeJobDescription = (req, res) => {

    const {
        title = "",
        company = "",
        description = ""
    } = req.body;

    if (!description.trim()) {
        return res.status(400).json({
            message: "Job description is required"
        });
    }

    const jobProfile = buildJobProfile({
        title,
        company,
        description
    });

    res.json({
        message: "Job description analyzed successfully",
        jobProfile
    });
};


module.exports = {
    createJob,
    analyzeJobDescription
};