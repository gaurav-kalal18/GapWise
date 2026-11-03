const { normalizeSkill } = require("./skill.service");
const { skillTaxonomy } = require("./skill.taxonomy");

const {
    calculateSkillConfidence,
    getConfidenceLevel
} = require("./confidence.service");


const extractSkillsFromResume = (sections) => {

    const detectedSkills = new Map();


    const addSkill = (skill, evidenceSource) => {

        const normalizedSkill = normalizeSkill(skill);

        if (!normalizedSkill) {
            return;
        }

        const existing = detectedSkills.get(normalizedSkill);

        if (!existing) {

            detectedSkills.set(normalizedSkill, {
                name: normalizedSkill,
                evidence: [evidenceSource]
            });

            return;
        }

        if (!existing.evidence.includes(evidenceSource)) {
            existing.evidence.push(evidenceSource);
        }
    };


    // --------------------------------------------------
    // 1. Technical Skills
    // --------------------------------------------------

    const skillsText = sections.skills || "";

    Object.keys(skillTaxonomy).forEach((skill) => {

        const escapedSkill = skill.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const pattern = new RegExp(
            `\\b${escapedSkill}\\b`,
            "i"
        );

        if (pattern.test(skillsText)) {
            addSkill(
                skill,
                "Technical Skills"
            );
        }
    });


    // --------------------------------------------------
    // 2. Projects
    // --------------------------------------------------

    const projectsText = sections.projects || "";

    Object.keys(skillTaxonomy).forEach((skill) => {

        const escapedSkill = skill.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const pattern = new RegExp(
            `\\b${escapedSkill}\\b`,
            "i"
        );

        if (pattern.test(projectsText)) {
            addSkill(
                skill,
                "Projects"
            );
        }
    });


    // --------------------------------------------------
    // 3. Coursework
    // --------------------------------------------------

    const courseworkText = sections.coursework || "";

    Object.keys(skillTaxonomy).forEach((skill) => {

        const escapedSkill = skill.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const pattern = new RegExp(
            `\\b${escapedSkill}\\b`,
            "i"
        );

        if (pattern.test(courseworkText)) {
            addSkill(
                skill,
                "Coursework"
            );
        }
    });


    // --------------------------------------------------
    // 4. Calculate confidence
    // --------------------------------------------------

    return Array.from(detectedSkills.values()).map((skill) => {

        const confidence = calculateSkillConfidence(
            skill.evidence
        );

        return {
            name: skill.name,
            confidence,
            confidenceLevel: getConfidenceLevel(confidence),
            evidence: skill.evidence
        };
    });
};


module.exports = {
    extractSkillsFromResume
};