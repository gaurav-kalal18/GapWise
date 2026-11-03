const getPriorityScore = (
    matchScore,
    requirementType,
    satisfiesRequirement = false
) => {

    const importanceScore =
        requirementType === "required"
            ? 1.0
            : 0.5;

    /*
     * A skill can have partial evidence without
     * actually satisfying the requirement.
     *
     * Example:
     * PostgreSQL -> SQL
     *
     * matchScore = 0.6
     * satisfiesRequirement = false
     *
     * Therefore the requirement still represents
     * a real gap.
     */

    if (!satisfiesRequirement) {
        return importanceScore;
    }

    return (1 - matchScore) * importanceScore;
};


const getPriorityLevel = (priorityScore) => {

    if (priorityScore >= 0.75) {
        return "high";
    }

    if (priorityScore >= 0.4) {
        return "medium";
    }

    return "low";
};


const getPriorityReason = (
    matchScore,
    requirementType,
    satisfiesRequirement = false
) => {

    if (
        !satisfiesRequirement &&
        matchScore > 0
    ) {
        if (requirementType === "required") {
            return "Required skill has supporting evidence but is not fully satisfied";
        }

        return "Preferred skill has supporting evidence but is not fully satisfied";
    }

    if (
        matchScore === 0 &&
        requirementType === "required"
    ) {
        return "Required skill is currently missing";
    }

    if (
        matchScore === 0 &&
        requirementType === "preferred"
    ) {
        return "Preferred skill is currently missing";
    }

    if (
        matchScore < 1 &&
        requirementType === "required"
    ) {
        return "Required skill is only partially matched";
    }

    if (
        matchScore < 1 &&
        requirementType === "preferred"
    ) {
        return "Preferred skill is only partially matched";
    }

    return "Skill requirement is satisfied";
};


const prioritizeGaps = (gaps) => {

    return gaps
        .map((gap) => {

            const priorityScore =
                getPriorityScore(
                    gap.matchScore,
                    gap.requirementType,
                    gap.satisfiesRequirement
                );

            return {
                ...gap,

                priorityScore,

                priorityLevel:
                    getPriorityLevel(priorityScore),

                priorityReason:
                    getPriorityReason(
                        gap.matchScore,
                        gap.requirementType,
                        gap.satisfiesRequirement
                    )
            };
        })

        .sort(
            (a, b) =>
                b.priorityScore -
                a.priorityScore
        );
};


module.exports = {
    getPriorityScore,
    getPriorityLevel,
    getPriorityReason,
    prioritizeGaps
};