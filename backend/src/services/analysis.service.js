const { matchSkills } = require("./matching.service");
const { prioritizeGaps } = require("./priority.service");
const { calculateReadiness } = require("./readiness.service");
const { prioritizeByDependencies } = require("./dependency.service");
const { generateRoadmap } = require("./roadmap.service");

const analyzeCandidateAgainstJob = (
    candidateProfile,
    jobProfile
) => {
    const candidateSkills =
        candidateProfile.skills || [];

    const requiredSkills =
        jobProfile.requiredSkills || [];

    const result = matchSkills(
        candidateSkills,
        requiredSkills
    );

    // Only fully satisfied requirements remain in matches.
    const satisfiedMatches =
        result.matches.filter(
            match => match.satisfiesRequirement
        );

    // Unsatisfied related matches are still gaps.
    // They contain useful supporting evidence,
    // but they do not satisfy the requirement.
    const partialMatches =
        result.matches.filter(
            match => !match.satisfiesRequirement
        );

    const allGaps = [
        ...partialMatches,
        ...result.gaps
    ];

    const prioritizedGaps =
        prioritizeGaps(allGaps);

    const dependencyAwareGaps =
        prioritizeByDependencies(
            prioritizedGaps,
            candidateSkills
        );

    const readiness =
        calculateReadiness(
            satisfiedMatches,
            dependencyAwareGaps
        );

    const roadmap =
        generateRoadmap(
            dependencyAwareGaps,
            candidateSkills
        );

    return {
        matches: satisfiedMatches,
        gaps: dependencyAwareGaps,
        readiness,
        roadmap
    };
};

module.exports = {
    analyzeCandidateAgainstJob
};