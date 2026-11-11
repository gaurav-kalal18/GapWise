const { skillTaxonomy } = require("./skill.taxonomy");
const { getMatchScore } = require("./scoring.service");

// Preserve the display name, but compare names without accidental
// differences in casing or whitespace.
const getSkillName = (skill) => {
    const name = typeof skill === "string"
        ? skill
        : skill?.canonicalName || skill?.skill || skill?.name || skill?.matchedPhrase;
    return typeof name === "string" ? name.trim().replace(/\s+/g, " ") : null;
};

const nameKey = (name) => name?.toLowerCase() || null;

const getSkillId = (skill) => {
    if (!skill || typeof skill !== "object") return null;
    return skill.canonicalSkillId || skill.skillId || skill.id || null;
};

const getRequirementType = (requirement) =>
    typeof requirement === "string"
        ? "required"
        : requirement.requirementType || "required";

// Strong relationships provide partial evidence only; they do not satisfy
// a job requirement. Keep this distinct from broad related skills.
const partialRelationships = {
    sql: ["postgresql", "mysql"],
    postgresql: ["sql"],
    mysql: ["sql"]
};

const isPartialMatch = (candidateName, requirementName) =>
    (partialRelationships[nameKey(requirementName)] || [])
        .includes(nameKey(candidateName));

const taxonomyIndex = new Map(
    Object.entries(skillTaxonomy).map(([name, info]) => [nameKey(name), info])
);

const findRelatedCandidate = (candidates, requiredName) => {
    const targetName = nameKey(requiredName);
    const requiredEntry = taxonomyIndex.get(targetName);

    return candidates.find(({ name }) => {
        const candidateEntry = taxonomyIndex.get(nameKey(name));
        return (
            candidateEntry?.relatedSkills?.some(s => nameKey(s) === targetName) ||
            requiredEntry?.relatedSkills?.some(s => nameKey(s) === nameKey(name))
        );
    }) || null;
};

const matchSkills = (candidateSkills = [], requiredSkills = []) => {
    const candidates = candidateSkills
        .map(original => ({ original, name: getSkillName(original), id: getSkillId(original) }))
        .filter(candidate => candidate.name);

    const matches = [];
    const gaps = [];

    for (const requirement of requiredSkills) {
        const skill = getSkillName(requirement);
        if (!skill) continue;
        const id = getSkillId(requirement);
        const requirementType = getRequirementType(requirement);

        // Prefer true shared canonical IDs. Name matching is a fallback for
        // legacy records and technology/ESCO namespaces that have not yet
        // been unified. Different names are NOT inferred equivalent here.
        const exact = candidates.find(candidate => id && candidate.id === id) ||
            candidates.find(candidate => nameKey(candidate.name) === nameKey(skill));

        if (exact) {
            matches.push({
                skill,
                requirementType,
                matchType: "exact",
                matchedWith: exact.name,
                matchScore: getMatchScore("exact"),
                satisfiesRequirement: true,
                candidateConfidence: exact.original?.confidence ?? null,
                candidateEvidence: exact.original?.evidence ?? null
            });
            continue;
        }

        const partial = candidates.find(candidate => isPartialMatch(candidate.name, skill));
        if (partial) {
            const confidence = partial.original?.confidence ?? null;
            matches.push({
                skill,
                requirementType,
                matchType: "related",
                matchedWith: partial.name,
                matchScore: getMatchScore("related"),
                satisfiesRequirement: false,
                candidateConfidence: confidence,
                candidateEvidence: partial.original?.evidence ?? null,
                evidenceStrength: confidence
            });
            continue;
        }

        const related = findRelatedCandidate(candidates, skill);
        gaps.push({
            skill,
            requirementType,
            matchType: "gap",
            matchedWith: related?.name ?? null,
            relatedSkill: Boolean(related),
            matchScore: getMatchScore("gap"),
            satisfiesRequirement: false
        });
    }

    return { matches, gaps };
};

module.exports = { matchSkills };
