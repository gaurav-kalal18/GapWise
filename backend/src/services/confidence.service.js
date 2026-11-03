const EVIDENCE_WEIGHTS = {
    "Technical Skills": 0.90,
    "Projects": 0.80,
    "Coursework": 0.70,
    "Experience": 0.85,
    "Achievements": 0.60,
    "Coding Profiles": 0.60
};


const CONFIDENCE_THRESHOLDS = {
    strong: 0.85,
    moderate: 0.65
};


const calculateSkillConfidence = (evidence) => {
    if (!evidence || evidence.length === 0) {
        return 0;
    }

    const uniqueEvidence = [...new Set(evidence)];

    const scores = uniqueEvidence
        .map((source) => EVIDENCE_WEIGHTS[source] || 0.40);

    // Strongest evidence becomes the base confidence.
    const baseConfidence = Math.max(...scores);

    // Additional independent evidence increases confidence.
    const additionalEvidenceBonus =
        Math.max(0, uniqueEvidence.length - 1) * 0.10;

    return Math.min(
        1,
        Number(
            (baseConfidence + additionalEvidenceBonus).toFixed(2)
        )
    );
};


const getConfidenceLevel = (confidence) => {

    if (confidence >= CONFIDENCE_THRESHOLDS.strong) {
        return "strong";
    }

    if (confidence >= CONFIDENCE_THRESHOLDS.moderate) {
        return "moderate";
    }

    return "weak";
};


module.exports = {
    EVIDENCE_WEIGHTS,
    CONFIDENCE_THRESHOLDS,
    calculateSkillConfidence,
    getConfidenceLevel
};