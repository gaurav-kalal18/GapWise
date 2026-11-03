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
         * Only a satisfied requirement contributes
         * to the achieved readiness score.
         *
         * Example:
         *
         * JavaScript → exact → satisfied
         * PostgreSQL → SQL → related but NOT satisfied
         */

        if (match.satisfiesRequirement) {

            achievedWeight += weight;

        } else if (match.matchScore > 0) {

            /*
             * Preserve partial evidence separately.
             *
             * This does NOT increase readiness yet.
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
         * A gap does not contribute to achieved
         * readiness, even if related evidence exists.
         *
         * Example:
         *
         * React
         * candidate has JavaScript
         *
         * Still a React gap.
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
    // Calculate readiness
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