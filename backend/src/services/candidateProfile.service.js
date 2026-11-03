const buildCandidateProfile = (resume) => {

    const sections = resume.sections || {};

    const skills = resume.skills || [];

    return {
        education: sections.education || "",

        skills: skills.map((skill) => ({
            name: skill.name,
            confidence: skill.confidence,
            confidenceLevel: skill.confidenceLevel,
            evidence: skill.evidence
        })),

        projects: sections.projects || "",

        experience: sections.experience || "",

        achievements: sections.achievements || "",

        coursework: sections.coursework || ""
    };
};


module.exports = {
    buildCandidateProfile
};