const MATCH_SCORES = {
    exact: 1.0,
    related: 0.6,
    gap: 0.0
};

const getMatchScore = (matchType) => {
    return MATCH_SCORES[matchType] ?? 0.0;
};

module.exports = {
    MATCH_SCORES,
    getMatchScore
};