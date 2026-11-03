const fs = require("fs");
const path = require("path");

const skillsFile = path.join(
    __dirname,
    "../../data/gapwise/skills.json"
);

const skills = JSON.parse(
    fs.readFileSync(skillsFile, "utf-8")
);


// --------------------------------------------------
// Normalization
// --------------------------------------------------

const normalizeName = (name) => {
    return name
        .toLowerCase()
        .replace(/[^\w+#.]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};


// --------------------------------------------------
// Build ESCO canonical-name index
// --------------------------------------------------

const escoNameIndex = new Map();

for (const skill of skills) {

    if (!skill.canonicalName) {
        continue;
    }

    const normalizedName =
        normalizeName(skill.canonicalName);

    if (!escoNameIndex.has(normalizedName)) {
        escoNameIndex.set(normalizedName, []);
    }

    escoNameIndex
        .get(normalizedName)
        .push(skill);
}


// --------------------------------------------------
// Explicit GapWise technology → ESCO mappings
// --------------------------------------------------

const technologyMappings = {
    "tech:javascript": {
        escoCanonicalName: "JavaScript"
    },

    "tech:python": {
        escoCanonicalName: "Python"
    },

    "tech:java": {
        escoCanonicalName: "Java"
    },

    "tech:cpp": {
        escoCanonicalName: "C++"
    }
};


// --------------------------------------------------
// Resolve technology to ESCO
// --------------------------------------------------

const resolveTechnologyToESCO = (technology) => {

    const mapping =
        technologyMappings[technology.skillId];

    if (!mapping) {
        return null;
    }

    const normalizedName =
        normalizeName(mapping.escoCanonicalName);

    const matches =
        escoNameIndex.get(normalizedName) || [];

    // Ambiguous ESCO concept.
    if (matches.length !== 1) {
        return null;
    }

    return matches[0];
};


// --------------------------------------------------
// Unify extracted skills
// --------------------------------------------------

const unifySkills = (skillsToUnify) => {

    const unified = new Map();

    for (const skill of skillsToUnify) {

        let canonicalKey = null;
        let escoSkill = null;


        // ------------------------------------------
        // ESCO skill
        // ------------------------------------------

        if (skill.source === "esco") {

            canonicalKey =
                `esco:${skill.skillId}`;

            escoSkill = skill;
        }


        // ------------------------------------------
        // GapWise technology
        // ------------------------------------------

        else if (
            skill.source === "gapwise-technology"
        ) {

            escoSkill =
                resolveTechnologyToESCO(skill);

            if (escoSkill) {

                canonicalKey =
                    `esco:${escoSkill.id}`;

            } else {

                canonicalKey =
                    `technology:${skill.skillId}`;
            }
        }


        // ------------------------------------------
        // Unknown source
        // ------------------------------------------

        else {

            canonicalKey =
                `${skill.source}:${skill.skillId}`;
        }


        // ------------------------------------------
        // First occurrence
        // ------------------------------------------

        if (!unified.has(canonicalKey)) {

            unified.set(canonicalKey, {

                canonicalSkillId: escoSkill
                    ? escoSkill.skillId || escoSkill.id
                    : skill.skillId,

                canonicalName: escoSkill
                    ? escoSkill.canonicalName
                    : skill.canonicalName,

                sources: [
                    skill.source
                ],

                sourceSkillIds: [
                    skill.skillId
                ],

                evidence: skill.evidence,

                start: skill.start,

                end: skill.end,

                requirementType:
                    skill.requirementType,

                requirementConfidence:
                    skill.requirementConfidence,

                extractionConfidence:
                    skill.extractionConfidence,

                extractionMethods: [
                    skill.extractionMethod
                ]
            });

            continue;
        }


        // ------------------------------------------
        // Duplicate / second representation
        // ------------------------------------------

        const existing =
            unified.get(canonicalKey);


        // ------------------------------------------
        // Sources
        // ------------------------------------------

        if (!existing.sources.includes(
            skill.source
        )) {

            existing.sources.push(
                skill.source
            );
        }


        // ------------------------------------------
        // Source skill IDs
        // ------------------------------------------

        if (!existing.sourceSkillIds.includes(
            skill.skillId
        )) {

            existing.sourceSkillIds.push(
                skill.skillId
            );
        }


        // ------------------------------------------
        // Extraction methods
        // ------------------------------------------

        if (!existing.extractionMethods.includes(
            skill.extractionMethod
        )) {

            existing.extractionMethods.push(
                skill.extractionMethod
            );
        }


        // ------------------------------------------
        // Prefer more certain requirement type
        // ------------------------------------------

        if (
            existing.requirementType === "unknown" &&
            skill.requirementType !== "unknown"
        ) {

            existing.requirementType =
                skill.requirementType;

            existing.requirementConfidence =
                skill.requirementConfidence;
        }


        // ------------------------------------------
        // Preserve positional information
        // ------------------------------------------

        if (
            existing.start === undefined &&
            skill.start !== undefined
        ) {

            existing.start = skill.start;
            existing.end = skill.end;
        }


        // ------------------------------------------
        // Prefer better evidence
        // ------------------------------------------

        if (
            (!existing.evidence ||
                existing.evidence.length === 0) &&
            skill.evidence
        ) {

            existing.evidence =
                skill.evidence;
        }
    }


    return Array.from(unified.values());
};


module.exports = {
    unifySkills,
    resolveTechnologyToESCO
};