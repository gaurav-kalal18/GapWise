const calculateReadiness = (matches, gaps) => {

    const allRequirements = [
        ...matches,
        ...gaps
    ];

    if (allRequirements.length === 0) {
        return {
            score: 0,
            level: "unknown",
            explanation: "No job skill requirements were detected."
        };
    }

    let totalWeight = 0;
    let achievedWeight = 0;

    let partialEvidenceWeight = 0;


    // ------------------------------------------------
    // Evaluate matched requirements
    // ------------------------------------------------

    matches.forEach((match) => {

        const weight =
            match.requirementType === "required"
                ? 2
                : 1;

        totalWeight += weight;

        /*
         * Only fully satisfied requirements
         * contribute to the current readiness score.
         */

        if (match.satisfiesRequirement) {

            achievedWeight += weight;

        } else if (match.matchScore > 0) {

            /*
             * Partial evidence is tracked separately.
             * It does not currently increase readiness.
             */

            partialEvidenceWeight +=
                match.matchScore * weight;
        }
    });


    // ------------------------------------------------
    // Evaluate gaps
    // ------------------------------------------------

    gaps.forEach((gap) => {

        const weight =
            gap.requirementType === "required"
                ? 2
                : 1;

        totalWeight += weight;

        /*
         * Related evidence does not currently
         * satisfy the requirement.
         */

        if (
            !gap.satisfiesRequirement &&
            gap.matchScore > 0
        ) {
            partialEvidenceWeight +=
                gap.matchScore * weight;
        }
    });


    // ------------------------------------------------
    // Calculate overall readiness
    // ------------------------------------------------

    const score =
        totalWeight === 0
            ? 0
            : Math.round(
                (achievedWeight / totalWeight) * 100
            );


    // ------------------------------------------------
    // Determine readiness level
    // ------------------------------------------------

    let level;

    if (score >= 80) {
        level = "high";
    } else if (score >= 60) {
        level = "moderate";
    } else {
        level = "low";
    }


    // ------------------------------------------------
    // Requirement statistics
    // ------------------------------------------------

    const requiredMatches = matches.filter(
        (match) =>
            match.requirementType === "required" &&
            match.satisfiesRequirement
    ).length;


    const requiredGaps = gaps.filter(
        (gap) =>
            gap.requirementType === "required"
    ).length;


    const preferredMatches = matches.filter(
        (match) =>
            match.requirementType === "preferred" &&
            match.satisfiesRequirement
    ).length;


    const preferredGaps = gaps.filter(
        (gap) =>
            gap.requirementType === "preferred"
    ).length;


    // ------------------------------------------------
    // Coverage metrics
    // ------------------------------------------------

    const totalRequired =
        requiredMatches + requiredGaps;

    const totalPreferred =
        preferredMatches + preferredGaps;


    const requiredCoverage =
        totalRequired === 0
            ? 100
            : Math.round(
                (requiredMatches / totalRequired) * 100
            );


    const preferredCoverage =
        totalPreferred === 0
            ? 100
            : Math.round(
                (preferredMatches / totalPreferred) * 100
            );


    // ------------------------------------------------
    // Return readiness analysis
    // ------------------------------------------------

    return {
        score,
        level,

        summary: {
            totalRequirements:
                allRequirements.length,

            requiredMatches,
            requiredGaps,

            preferredMatches,
            preferredGaps,

            requiredCoverage,
            preferredCoverage,

            partialEvidence:
                partialEvidenceWeight > 0
        },

        explanation:
            `${requiredMatches} required skills matched, ` +
            `${requiredGaps} required skills missing, and ` +
            `${preferredGaps} preferred skills missing.`
    };
};


module.exports = {
    calculateReadiness
};