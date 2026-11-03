const { skillTaxonomy } = require("./skill.taxonomy");
const { getMatchScore } = require("./scoring.service");

// Convert different skill formats into a canonical skill name
const normalizeSkill = (skill) => {
    if (typeof skill === "string") {
        return skill;
    }

    if (skill && typeof skill === "object") {
        return (
            skill.canonicalName ||
            skill.skill ||
            skill.name ||
            skill.matchedPhrase ||
            null
        );
    }

    return null;
};

// Get the original candidate skill object
const getCandidateSkillObject = (candidateSkills, skillName) => {
    return candidateSkills.find(
        (skill) => normalizeSkill(skill) === skillName
    );
};

// Get requirement type
const getRequirementType = (requirement) => {
    if (typeof requirement === "string") {
        return "required";
    }

    return requirement.requirementType || "required";
};

/*
 * Some relationships are strong enough to provide
 * partial evidence for the required skill.
 *
 * Example:
 * PostgreSQL -> SQL
 *
 * But:
 * JavaScript -> React
 *
 * does NOT mean the candidate knows React.
 */
const isPartialMatch = (candidateSkill, requiredSkill) => {

    const partialRelationships = {
        SQL: ["PostgreSQL", "MySQL"],
        PostgreSQL: ["SQL"],
        MySQL: ["SQL"]
    };

    return (
        partialRelationships[requiredSkill]?.includes(candidateSkill) ||
        false
    );
};

// Find a related skill from the taxonomy
const findRelatedSkill = (candidateSkills, requiredSkill) => {

    const requiredInfo = skillTaxonomy[requiredSkill];

    for (const candidateSkill of candidateSkills) {

        const candidateInfo = skillTaxonomy[candidateSkill];

        const candidateRelatedToRequired =
            candidateInfo &&
            Array.isArray(candidateInfo.relatedSkills) &&
            candidateInfo.relatedSkills.includes(requiredSkill);

        const requiredRelatedToCandidate =
            requiredInfo &&
            Array.isArray(requiredInfo.relatedSkills) &&
            requiredInfo.relatedSkills.includes(candidateSkill);

        if (
            candidateRelatedToRequired ||
            requiredRelatedToCandidate
        ) {
            return candidateSkill;
        }
    }

    return null;
};

const matchSkills = (candidateSkills, requiredSkills) => {

    const normalizedCandidateSkills =
        candidateSkills
            .map(normalizeSkill)
            .filter(Boolean);

    const candidateSet = new Set(normalizedCandidateSkills);

    const matches = [];
    const gaps = [];

    requiredSkills.forEach((requirement) => {

        const skill = normalizeSkill(requirement);

        if (!skill) {
            return;
        }

        const requirementType =
            getRequirementType(requirement);

        // ------------------------------------------------
        // 1. EXACT MATCH
        // ------------------------------------------------

        if (candidateSet.has(skill)) {

            matches.push({
                skill,
                requirementType,
                matchType: "exact",
                matchedWith: skill,
                matchScore: getMatchScore("exact"),
                satisfiesRequirement: true
            });

            return;
        }

        // ------------------------------------------------
        // 2. PARTIAL / STRONG RELATED MATCH
        // ------------------------------------------------

        const partialMatch =
            normalizedCandidateSkills.find(
                candidateSkill =>
                    isPartialMatch(candidateSkill, skill)
            );

       if (partialMatch) {

    const matchedCandidate =
        getCandidateSkillObject(
            candidateSkills,
            partialMatch
        );

    const candidateConfidence =
        matchedCandidate?.confidence ?? 0;

    matches.push({
        skill,
        requirementType,
        matchType: "related",
        matchedWith: partialMatch,
        matchScore: getMatchScore("related"),
        satisfiesRequirement: false,
        candidateConfidence,
        candidateEvidence:
            matchedCandidate?.evidence ?? null,
        evidenceStrength: candidateConfidence
    });

    return;
}
        // ------------------------------------------------
        // 3. GENERIC RELATED SKILL
        // ------------------------------------------------

        const relatedMatch =
            findRelatedSkill(
                normalizedCandidateSkills,
                skill
            );

        /*
         * Important:
         *
         * A generic related skill does NOT satisfy
         * the requirement.
         *
         * Example:
         * JavaScript -> React
         *
         * Candidate knowing JavaScript does not
         * mean candidate knows React.
         *
         * Therefore we classify this as a GAP.
         */

        if (relatedMatch) {

            gaps.push({
                skill,
                requirementType,
                matchType: "gap",
                matchedWith: relatedMatch,
                relatedSkill: true,
                matchScore: getMatchScore("gap"),
                satisfiesRequirement: false
            });

            return;
        }

        // ------------------------------------------------
        // 4. COMPLETE GAP
        // ------------------------------------------------

        gaps.push({
            skill,
            requirementType,
            matchType: "gap",
            matchedWith: null,
            relatedSkill: false,
            matchScore: getMatchScore("gap"),
            satisfiesRequirement: false
        });
    });

    return {
        matches,
        gaps
    };
};

module.exports = {
    matchSkills
};