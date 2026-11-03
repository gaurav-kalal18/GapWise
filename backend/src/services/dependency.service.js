const skillDependencies = {
    "React": {
        prerequisites: ["JavaScript"]
    },

    "Node.js": {
        prerequisites: ["JavaScript"]
    },

    "Express.js": {
        prerequisites: ["Node.js"]
    },

    "TypeScript": {
        prerequisites: ["JavaScript"]
    },

    "Data Structures": {
        prerequisites: ["Programming"]
    },

    "Algorithms": {
        prerequisites: ["Data Structures"]
    },

    "Machine Learning": {
        prerequisites: ["Python", "Statistics"]
    },

    "Data Science": {
        prerequisites: ["Python", "Statistics"]
    },

    "PostgreSQL": {
        prerequisites: ["SQL", "Databases"]
    },

    "MySQL": {
        prerequisites: ["SQL", "Databases"]
    }
};


// ------------------------------------------------
// Normalize skill
// ------------------------------------------------

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


// ------------------------------------------------
// Get prerequisites
// ------------------------------------------------

const getPrerequisites = (skill) => {

    return (
        skillDependencies[skill]?.prerequisites ||
        []
    );
};


// ------------------------------------------------
// Calculate dependency depth
// ------------------------------------------------

const getDependencyDepth = (
    skill,
    visited = new Set()
) => {

    if (visited.has(skill)) {
        return 0;
    }

    visited.add(skill);

    const prerequisites =
        getPrerequisites(skill);

    if (prerequisites.length === 0) {
        return 0;
    }

    return (
        1 +
        Math.max(
            ...prerequisites.map(
                (prerequisite) =>
                    getDependencyDepth(
                        prerequisite,
                        new Set(visited)
                    )
            )
        )
    );
};


// ------------------------------------------------
// Dependency-aware prioritization
// ------------------------------------------------

const prioritizeByDependencies = (
    gaps,
    candidateSkills
) => {

    const normalizedCandidateSkills =
        candidateSkills
            .map(normalizeSkill)
            .filter(Boolean);

    const candidateSet =
        new Set(normalizedCandidateSkills);

    return gaps
        .map((gap) => {

            const prerequisites =
                getPrerequisites(gap.skill);

            const missingPrerequisites =
                prerequisites.filter(
                    (prerequisite) =>
                        !candidateSet.has(prerequisite)
                );

            const dependencyDepth =
                getDependencyDepth(gap.skill);

            return {
                ...gap,

                prerequisites,

                missingPrerequisites,

                dependencyDepth,

                learningPriority:
                    gap.priorityScore +
                    missingPrerequisites.length * 0.25
            };
        })
        .sort(
            (a, b) =>
                b.learningPriority -
                a.learningPriority
        );
    };


module.exports = {
    skillDependencies,
    getPrerequisites,
    getDependencyDepth,
    prioritizeByDependencies
};