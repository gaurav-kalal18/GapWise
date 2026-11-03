const { normalizeSkill } = require("./skill.service");
const { skillTaxonomy } = require("./skill.taxonomy");
const { extractTechnologies } = require("./technology.service");

const {
    calculateSkillConfidence,
    getConfidenceLevel
} = require("./confidence.service");


// --------------------------------------------------
// Extract conceptual skills from a section
// --------------------------------------------------

const extractConceptualSkills = (text, evidenceSource) => {

    if (!text || typeof text !== "string") {
        return [];
    }

    const detectedSkills = [];

    Object.keys(skillTaxonomy).forEach((skill) => {

        const escapedSkill = skill.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const pattern = new RegExp(
            `\\b${escapedSkill}\\b`,
            "i"
        );

        if (pattern.test(text)) {
            detectedSkills.push({
                name: normalizeSkill(skill),
                source: "skill-taxonomy",
                skillId: normalizeSkill(skill),
                evidence: [evidenceSource]
            });
        }
    });

    return detectedSkills;
};


// --------------------------------------------------
// Extract technologies from a section
// --------------------------------------------------

const extractTechnologySkills = (text, evidenceSource) => {

    if (!text || typeof text !== "string") {
        return [];
    }

    const technologies = extractTechnologies(text);

    return technologies.map((technology) => ({
        name: technology.canonicalName,
        skillId: technology.skillId,
        source: "gapwise-technology",
        evidence: [evidenceSource]
    }));
};


// --------------------------------------------------
// Extract skills from complete resume
// --------------------------------------------------

const extractSkillsFromResume = (sections) => {

    const detectedSkills = new Map();


    // --------------------------------------------------
    // Add / merge skill
    // --------------------------------------------------

    const addSkill = (skill, evidenceSource) => {

        const normalizedSkill = normalizeSkill(skill.name);

        if (!normalizedSkill) {
            return;
        }

        const existing = detectedSkills.get(normalizedSkill);

        if (!existing) {

            detectedSkills.set(normalizedSkill, {
                name: normalizedSkill,
                skillId: skill.skillId,
                source: skill.source,
                evidence: [evidenceSource]
            });

            return;
        }

        if (!existing.evidence.includes(evidenceSource)) {
            existing.evidence.push(evidenceSource);
        }

        // Prefer a real technology identity if one is available.
        if (
            !existing.skillId &&
            skill.skillId
        ) {
            existing.skillId = skill.skillId;
        }

        if (
            existing.source === "skill-taxonomy" &&
            skill.source === "gapwise-technology"
        ) {
            existing.source = skill.source;
        }
    };


    // --------------------------------------------------
    // Process a section
    // --------------------------------------------------

    const processSection = (text, evidenceSource) => {

        if (!text) {
            return;
        }


        // Conceptual skills
        const conceptualSkills =
            extractConceptualSkills(
                text,
                evidenceSource
            );

        conceptualSkills.forEach((skill) => {

            skill.evidence.forEach((evidence) => {
                addSkill(skill, evidence);
            });

        });


        // Technologies
        const technologySkills =
            extractTechnologySkills(
                text,
                evidenceSource
            );

        technologySkills.forEach((skill) => {

            skill.evidence.forEach((evidence) => {
                addSkill(skill, evidence);
            });

        });
    };


    // --------------------------------------------------
    // Process resume sections
    // --------------------------------------------------

    processSection(
        sections.skills,
        "Technical Skills"
    );

    processSection(
        sections.projects,
        "Projects"
    );

    processSection(
        sections.experience,
        "Experience"
    );

    processSection(
        sections.coursework,
        "Coursework"
    );


    // --------------------------------------------------
    // Calculate confidence
    // --------------------------------------------------

    return Array.from(detectedSkills.values()).map((skill) => {

        const confidence =
            calculateSkillConfidence(
                skill.evidence
            );

        return {
            skillId: skill.skillId,
            canonicalName: skill.name,
            source: skill.source,
            confidence,
            confidenceLevel:
                getConfidenceLevel(confidence),
            evidence: skill.evidence
        };
    });
};


module.exports = {
    extractSkillsFromResume
};