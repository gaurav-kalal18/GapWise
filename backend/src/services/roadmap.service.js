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


const getLearningAction = (skill) => {

    const actions = {

        "React": [
            "Learn React fundamentals",
            "Practice components, props, state, and hooks",
            "Build a small React application"
        ],

        "Node.js": [
            "Learn Node.js fundamentals",
            "Build REST APIs with Node.js",
            "Build a backend service"
        ],

        "Express.js": [
            "Learn Express.js fundamentals",
            "Build REST API routes and middleware",
            "Build and deploy an Express API"
        ],

        "TypeScript": [
            "Learn TypeScript fundamentals",
            "Convert a JavaScript project to TypeScript",
            "Use TypeScript in a full-stack project"
        ],

        "SQL": [
            "Learn SQL fundamentals",
            "Practice joins, aggregation, and subqueries",
            "Build queries for a real database"
        ],

        "PostgreSQL": [
            "Learn PostgreSQL fundamentals",
            "Practice schema design and indexing",
            "Integrate PostgreSQL with a backend application"
        ],

        "MySQL": [
            "Learn MySQL fundamentals",
            "Practice relational queries and joins",
            "Build a database-backed application"
        ],

        "Data Structures": [
            "Learn fundamental data structures",
            "Practice implementation and complexity analysis",
            "Solve problems using appropriate data structures"
        ],

        "Algorithms": [
            "Learn core algorithmic techniques",
            "Practice complexity analysis",
            "Solve progressively harder algorithmic problems"
        ],

        "Machine Learning": [
            "Learn supervised and unsupervised learning fundamentals",
            "Practice model training and evaluation",
            "Build an end-to-end machine learning project"
        ],

        "Python": [
            "Strengthen Python fundamentals",
            "Practice Python through problem solving",
            "Build a practical Python project"
        ]
    };

    return actions[skill] || [
        `Learn ${skill} fundamentals`,
        `Practice ${skill} through hands-on exercises`,
        `Build a small project using ${skill}`
    ];
};

const getEvidenceAwareAction = (gap) => {

    if (
        gap.matchType === "related" &&
        gap.evidenceStrength > 0
    ) {
        return [
            `Strengthen ${gap.skill} using your existing ${gap.matchedWith} knowledge`,
            `Practice ${gap.skill} concepts and real-world problems`,
            `Build a project that demonstrates ${gap.skill}`
        ];
    }

    return getLearningAction(gap.skill);
};


const getEstimatedWeeks = (
    priorityLevel,
    dependencyDepth
) => {

    let weeks = 2;

    if (priorityLevel === "high") {
        weeks += 1;
    }

    if (dependencyDepth >= 2) {
        weeks += 1;
    }

    return weeks;
};


const generateRoadmap = (
    gaps,
    candidateSkills
) => {

    // Normalize rich candidate skill objects
    // into canonical skill names.
    const normalizedCandidateSkills =
        candidateSkills
            .map(normalizeSkill)
            .filter(Boolean);

    const candidateSet =
        new Set(normalizedCandidateSkills);

    const roadmap = [];


    gaps.forEach((gap) => {

        const missingPrerequisites =
            gap.missingPrerequisites || [];


        /*
         * Only add prerequisites that the candidate
         * genuinely does not have.
         */

        const prerequisitesToLearn =
            missingPrerequisites.filter(
                (skill) =>
                    !candidateSet.has(skill)
            );


        // --------------------------------------------
        // Add prerequisites first
        // --------------------------------------------

        prerequisitesToLearn.forEach(
            (prerequisite) => {

                const alreadyAdded =
                    roadmap.some(
                        (item) =>
                            item.skill === prerequisite
                    );

                if (alreadyAdded) {
                    return;
                }

                roadmap.push({
                    order:
                        roadmap.length + 1,

                    skill:
                        prerequisite,

                    type:
                        "prerequisite",

                    priority:
                        "foundation",

                    estimatedWeeks:
                        2,

                   actions:
    getLearningAction(prerequisite)
                });
            }
        );


        // --------------------------------------------
        // Add target skill
        // --------------------------------------------

        roadmap.push({

            order:
                roadmap.length + 1,

            skill:
                gap.skill,

            type:
                "target",

            priority:
                gap.priorityLevel,

            priorityScore:
                gap.priorityScore,

            learningPriority:
                gap.learningPriority,

            dependencyDepth:
                gap.dependencyDepth,

            estimatedWeeks:
                getEstimatedWeeks(
                    gap.priorityLevel,
                    gap.dependencyDepth
                ),

            reason:
                gap.priorityReason,
actions:
    getEvidenceAwareAction(gap)
        });
    });


    return roadmap;
};


module.exports = {
    generateRoadmap
};