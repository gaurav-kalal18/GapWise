const normalizeText = (text) => {
    return text
        .toLowerCase()
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n+/g, "\n")
        .trim();
};


// Strong signals that indicate a mandatory requirement.
const REQUIRED_PATTERNS = [
    /\brequired\b/,
    /\brequirement[s]?\b/,
    /\bmust\b/,
    /\bmandatory\b/,
    /\bessential\b/,
    /\bneed(?:ed)?\b/,
    /\bshould have\b/,
    /\bmust have\b/
];


// Signals that usually indicate a non-mandatory requirement.
const PREFERRED_PATTERNS = [
    /\bpreferred\b/,
    /\bprefer(?:red)?\b/,
    /\bplus\b/,
    /\bnice to have\b/,
    /\bnice-to-have\b/,
    /\bbonus\b/,
    /\badvantage\b/,
    /\bdesirable\b/,
    /\bideally\b/
];


const containsPattern = (text, patterns) => {
    return patterns.some(pattern => pattern.test(text));
};


const classifyRequirement = (evidence) => {

    const text = normalizeText(evidence);

    const hasRequiredSignal =
        containsPattern(text, REQUIRED_PATTERNS);

    const hasPreferredSignal =
        containsPattern(text, PREFERRED_PATTERNS);


    /*
     * If both signals appear in the same evidence,
     * we avoid pretending that the rule system knows
     * which one applies to the skill.
     */
    if (hasRequiredSignal && hasPreferredSignal) {
        return {
            requirementType: "unknown",
            classificationMethod: "rule-based-conflict",
            confidence: 0.5
        };
    }


    if (hasRequiredSignal) {
        return {
            requirementType: "required",
            classificationMethod: "rule-based",
            confidence: 0.9
        };
    }


    if (hasPreferredSignal) {
        return {
            requirementType: "preferred",
            classificationMethod: "rule-based",
            confidence: 0.85
        };
    }


    return {
        requirementType: "unknown",
        classificationMethod: "rule-based-default",
        confidence: 0.4
    };
};


module.exports = {
    classifyRequirement
};