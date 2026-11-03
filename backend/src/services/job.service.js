const { normalizeSkill } = require("./skill.service");
const { skillTaxonomy } = require("./skill.taxonomy");


const containsSkill = (text, skill) => {
    const escapedSkill = skill.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

    const pattern = new RegExp(
        `\\b${escapedSkill}\\b`,
        "i"
    );

    return pattern.test(text);
};


const detectRequirementType = (text, skill) => {

    const lowerText = text.toLowerCase();

    const skillIndex = lowerText.indexOf(
        skill.toLowerCase()
    );

    if (skillIndex === -1) {
        return "required";
    }

    const surroundingText = lowerText.substring(
        Math.max(0, skillIndex - 100),
        Math.min(
            lowerText.length,
            skillIndex + skill.length + 100
        )
    );

    if (
        surroundingText.includes("preferred") ||
        surroundingText.includes("nice to have") ||
        surroundingText.includes("good to have") ||
        surroundingText.includes("plus")
    ) {
        return "preferred";
    }

    return "required";
};


const extractJobSkills = (jobDescription) => {

    const detectedSkills = new Map();

    Object.keys(skillTaxonomy).forEach((skill) => {

        if (!containsSkill(jobDescription, skill)) {
            return;
        }

        const normalizedSkill = normalizeSkill(skill);

        const requirementType =
            detectRequirementType(
                jobDescription,
                skill
            );

        detectedSkills.set(normalizedSkill, {
            skill: normalizedSkill,
            requirementType
        });
    });

    return Array.from(detectedSkills.values());
};


const buildJobProfile = ({
    title = "",
    company = "",
    description = ""
}) => {

    const requiredSkills =
        extractJobSkills(description);

    return {
        title,
        company,
        description,
        requiredSkills
    };
};


module.exports = {
    extractJobSkills,
    buildJobProfile
};