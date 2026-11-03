const getMatchScore = (matchType) => {
    switch (matchType) {
        case "exact":
            return 1.0;

        case "related":
            return 0.6;

        case "gap":
            return 0.0;

        default:
            return 0.0;
    }
};

module.exports = {
    getMatchScore
};