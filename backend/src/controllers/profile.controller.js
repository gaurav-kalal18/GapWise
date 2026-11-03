const { normalizeSkill } = require("../services/skill.service");

const getProfile = (req, res) => {
    res.json({
        candidate: {
            name: "Gaurav",
            education: {
                degree: "B.Tech",
                field: "Computer Science and Engineering",
                graduationYear: 2028
            },
            skills: [
                {
                    name: "C++",
                    confidence: 0.95,
                    evidence: ["Competitive Programming"]
                },
                {
                    name: "Python",
                    confidence: 0.82,
                    evidence: ["Projects", "Coursework"]
                }
            ],
            projects: [
                {
                    name: "CF Compass",
                    description: "Competitive programming analytics platform"
                }
            ],
            experience: []
        }
    });
};

const createProfile = (req, res) => {
    const { name, skills = [] } = req.body;

    const normalizedSkills = skills.map(normalizeSkill);

    const profile = {
        name,
        skills: normalizedSkills
    };

    res.status(201).json({
        message: "Profile received successfully",
        profile: profile
    });
};

module.exports = {
    getProfile,
    createProfile
};