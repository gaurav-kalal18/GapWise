const fs = require("fs");
const path = require("path");

const unificationService =
    require("./skill.unification.service");

const technologyService =
    require("./technology.service");

const requirementService =
    require("./requirement.service");

const sectionService =
    require("./jd-section.service");

const skillsFile = path.join(
    __dirname,
    "../../data/gapwise/skills.json"
);

const skills = JSON.parse(
    fs.readFileSync(skillsFile, "utf-8")
);


// --------------------------------------------------
// Text Utilities
// --------------------------------------------------

const normalizeText = (text) => {
    return text
        .toLowerCase()
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n+/g, "\n")
        .trim();
};


const getSentence = (text, start, end) => {

    const beforeText = text.slice(0, start);
    const afterText = text.slice(end);

    const beforeMatch = beforeText.match(
        /(?:^|[.!?])\s+/g
    );

    let sentenceStart = 0;

    if (beforeMatch && beforeMatch.length > 0) {

        const lastMatch =
            beforeMatch[beforeMatch.length - 1];

        sentenceStart =
            beforeText.lastIndexOf(lastMatch) +
            lastMatch.length;
    }


    const afterMatch = afterText.match(
        /[.!?](?:\s+|$)/
    );

    let sentenceEnd = text.length;

    if (afterMatch) {

        sentenceEnd =
            end +
            afterMatch.index +
            afterMatch[0].length;
    }


    return text
        .slice(sentenceStart, sentenceEnd)
        .trim();
};


const escapeRegex = (text) => {
    return text.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
};


// --------------------------------------------------
// ESCO Canonical Skill Index
// --------------------------------------------------

const canonicalIndex = new Map();

for (const skill of skills) {

    if (!skill.canonicalName) {
        continue;
    }

    const phrase = skill.canonicalName
        .trim()
        .toLowerCase();

    if (!phrase) {
        continue;
    }

    if (!canonicalIndex.has(phrase)) {
        canonicalIndex.set(phrase, []);
    }

    canonicalIndex
        .get(phrase)
        .push(skill);
}


// Only use unambiguous ESCO canonical names.
const escoCandidates = [];

for (const [phrase, matchingSkills] of canonicalIndex) {

    if (matchingSkills.length !== 1) {
        continue;
    }

    escoCandidates.push({
        phrase,
        skill: matchingSkills[0]
    });
}


// Longer phrases first.
escoCandidates.sort((a, b) => {
    return b.phrase.length - a.phrase.length;
});


// --------------------------------------------------
// Extract ESCO Skills
// --------------------------------------------------

const extractESCOskills = (text) => {

    const matches = [];

    for (const candidate of escoCandidates) {

        const regex = new RegExp(
            `(?<![a-z0-9])${escapeRegex(candidate.phrase)}(?![a-z0-9])`,
            "gi"
        );

        let match;

        while ((match = regex.exec(text)) !== null) {

            matches.push({
                skill: candidate.skill,
                phrase: candidate.phrase,
                start: match.index,
                end: match.index + match[0].length
            });
        }
    }


    // Longer matches first.
    matches.sort((a, b) => {

        const lengthA =
            a.end - a.start;

        const lengthB =
            b.end - b.start;

        return lengthB - lengthA;
    });


    // Remove overlapping matches.
    const accepted = [];

    for (const match of matches) {

        const overlaps = accepted.some(
            existing => {

                return (
                    match.start < existing.end &&
                    match.end > existing.start
                );
            }
        );

        if (overlaps) {
            continue;
        }

        accepted.push(match);
    }


    // Restore document order.
    accepted.sort((a, b) => {
        return a.start - b.start;
    });


    const detected = new Map();

    for (const match of accepted) {

        const skillId = match.skill.id;

        if (detected.has(skillId)) {
            continue;
        }


        const evidence = getSentence(
            text,
            match.start,
            match.end
        );


        detected.set(skillId, {

            skillId,

            canonicalName:
                match.skill.canonicalName,

            matchedPhrase:
                match.phrase,

            evidence,

            start: match.start,

            end: match.end,

            extractionMethod:
                "esco-canonical",

            extractionConfidence:
                1.0,

            source:
                "esco"
        });
    }


    return Array.from(
        detected.values()
    );
};


// --------------------------------------------------
// Section Context
// --------------------------------------------------

const getSectionContext = (
    sections,
    start,
    end
) => {

    for (const section of sections) {

        if (
            start >= section.start &&
            end <= section.end
        ) {
            return section.type;
        }
    }

    return "unknown";
};


// --------------------------------------------------
// Requirement Classification
// --------------------------------------------------

const classifySkillRequirement = (
    skill,
    sections
) => {

    const sectionType =
        getSectionContext(
            sections,
            skill.start,
            skill.end
        );


    /*
     * Section heading gives strong contextual
     * information.
     *
     * Example:
     *
     * Required Qualifications
     * JavaScript
     *
     * The word "required" is not in the same
     * sentence as JavaScript, but the section
     * tells us that it is required.
     */

    if (sectionType === "required") {

        return {
            requirementType: "required",
            confidence: 0.95,
            classificationMethod:
                "section-context"
        };
    }


    if (sectionType === "preferred") {

        return {
            requirementType: "preferred",
            confidence: 0.95,
            classificationMethod:
                "section-context"
        };
    }


    /*
     * Responsibilities should NOT automatically
     * mean that a skill is required.
     *
     * Example:
     *
     * Responsibilities
     * Work with Docker deployments.
     *
     * This tells us Docker is relevant to the job,
     * but does not necessarily establish a formal
     * requirement.
     *
     * Therefore we fall back to explicit
     * sentence-level signals.
     */


    const classification =
        requirementService.classifyRequirement(
            skill.evidence
        );


    return {
        requirementType:
            classification.requirementType,

        confidence:
            classification.confidence,

        classificationMethod:
            classification.classificationMethod
    };
};


// --------------------------------------------------
// Unified JD Extraction
// --------------------------------------------------

const extractSkillsFromJD = (jdText) => {

    if (
        !jdText ||
        typeof jdText !== "string"
    ) {
        throw new Error(
            "JD text is required"
        );
    }


    // Normalize once so all position calculations
    // remain aligned.
    const text = normalizeText(jdText);


    // Parse sections and preserve their positions.
    const sections =
        sectionService.parseJDSections(text);


    // --------------------------------------------------
    // 1. ESCO skills
    // --------------------------------------------------

    const escoSkills =
        extractESCOskills(text);


    // --------------------------------------------------
    // 2. GapWise technology skills
    // --------------------------------------------------

    const technologySkills =
        technologyService.extractTechnologies(
            text
        );


    // --------------------------------------------------
    // 3. Merge raw skill detections
    // --------------------------------------------------

    const unifiedSkills = [
        ...escoSkills,
        ...technologySkills
    ];


    // --------------------------------------------------
    // 4. Requirement classification
    // --------------------------------------------------

    const classifiedSkills =
        unifiedSkills.map(skill => {

            const classification =
                classifySkillRequirement(
                    skill,
                    sections
                );


            return {
                ...skill,

                requirementType:
                    classification.requirementType,

                requirementConfidence:
                    classification.confidence,

                requirementClassificationMethod:
                    classification.classificationMethod
            };
        });


    // --------------------------------------------------
    // 5. Final skill unification
    // --------------------------------------------------

    return unificationService.unifySkills(
        classifiedSkills
    );
};


// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
    extractSkillsFromJD
};