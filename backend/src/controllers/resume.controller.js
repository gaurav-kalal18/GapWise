const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const {
    extractSkillsFromResume
} = require("../services/resumeSkill.service");
const {
    extractResumeStructure
} = require("../services/resume.service");
const {
    buildCandidateProfile
} = require("../services/candidateProfile.service");

const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No resume file uploaded"
            });
        }

        const fileBuffer = fs.readFileSync(req.file.path);

        const parser = new PDFParse({
            data: fileBuffer
        });

        const result = await parser.getText();

        await parser.destroy();

        const resume = extractResumeStructure(result.text);

        const skills = extractSkillsFromResume(
    resume.sections
);

const candidateProfile = buildCandidateProfile({
    ...resume,
    skills
});

   res.json({
    message: "Resume processed successfully",

    filename: req.file.originalname,

    resume: {
        cleanedText: resume.cleanedText,
        sections: resume.sections,
        skills
    },

    candidateProfile
});

    } catch (error) {
        console.error("Resume processing error:", error);

        res.status(500).json({
            message: "Failed to process resume",
            error: error.message
        });
    }
};


module.exports = {
    uploadResume
};