const buildCandidateProfile = (resume) => {
    const sections = resume.sections || {};
    const skills = resume.skills || [];
    return {
        education: sections.education || '',
        skills: skills.map(skill => ({skillId:skill.skillId, canonicalName:skill.canonicalName, source:skill.source, confidence:skill.confidence, confidenceLevel:skill.confidenceLevel, evidence:skill.evidence})),
        projects: sections.projects || '', experience: sections.experience || '', achievements: sections.achievements || '', coursework: sections.coursework || '',
        codingProfiles: sections.codingProfiles || '', positions: sections.positions || ''
    };
};
module.exports = { buildCandidateProfile };
