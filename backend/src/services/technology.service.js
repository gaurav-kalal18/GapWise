const technologyTaxonomy = require("./technology.taxonomy");

const normalizeText = (text) => {
    return text
        .toLowerCase()
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n+/g, "\n")
        .trim();
};

const escapeRegex = (text) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getSentence = (text, start, end) => {
    const beforeText = text.slice(0, start);
    const afterText = text.slice(end);

    const beforeMatch = beforeText.match(
        /(?:^|[.!?])\s+/g
    );

    let sentenceStart = 0;

    if (beforeMatch && beforeMatch.length > 0) {
        const lastMatch =
            beforeMatch[beforeMatch.length - 1];

        sentenceStart =
            beforeText.lastIndexOf(lastMatch) +
            lastMatch.length;
    }

    const afterMatch = afterText.match(
    /[.!?](?:\s+|$)/
);

    let sentenceEnd = text.length;

    if (afterMatch) {
        sentenceEnd =
            end +
            afterMatch.index +
            afterMatch[0].length;
    }

    return text
        .slice(sentenceStart, sentenceEnd)
        .trim();
};


// --------------------------------------------------
// Build searchable alias index
// --------------------------------------------------

const candidates = [];

for (const technology of technologyTaxonomy) {

    for (const alias of technology.aliases) {

        candidates.push({
            phrase: alias.toLowerCase(),
            technology
        });
    }
}


// Longer aliases first.
candidates.sort((a, b) => {
    return b.phrase.length - a.phrase.length;
});


// --------------------------------------------------
// Extract technologies
// --------------------------------------------------

const extractTechnologies = (text) => {

    if (!text || typeof text !== "string") {
        throw new Error("Text is required");
    }

    const normalizedText = normalizeText(text);

    const matches = [];


    // --------------------------------------------------
    // Find all technology matches
    // --------------------------------------------------

    for (const candidate of candidates) {

        const regex = new RegExp(
            `(?<![a-z0-9])${escapeRegex(candidate.phrase)}(?![a-z0-9])`,
            "gi"
        );

        let match;

        while (
            (match = regex.exec(normalizedText)) !== null
        ) {

            matches.push({
                technology: candidate.technology,
                matchedPhrase: candidate.phrase,
                start: match.index,
                end: match.index + match[0].length
            });
        }
    }


    // --------------------------------------------------
    // Prefer longer matches when aliases overlap
    // --------------------------------------------------

    matches.sort((a, b) => {

        const lengthA = a.end - a.start;
        const lengthB = b.end - b.start;

        return lengthB - lengthA;
    });


    const accepted = [];

    for (const match of matches) {

        const overlaps = accepted.some(existing => {

            return (
                match.start < existing.end &&
                match.end > existing.start
            );
        });

        if (overlaps) {
            continue;
        }

        accepted.push(match);
    }


    // Restore original text order
    accepted.sort((a, b) => {
        return a.start - b.start;
    });


    // --------------------------------------------------
    // Remove duplicate technologies
    // --------------------------------------------------

    const detected = new Map();

    for (const match of accepted) {

        const technology = match.technology;

        if (detected.has(technology.id)) {
            continue;
        }


        // Sentence containing the matched technology.
        const evidence = getSentence(
            normalizedText,
            match.start,
            match.end
        );


        detected.set(technology.id, {

            skillId: technology.id,

            canonicalName:
                technology.canonicalName,

            category:
                technology.category,

            matchedPhrase:
                match.matchedPhrase,

            evidence,

            // Preserve position for JD section mapping.
            start: match.start,
            end: match.end,

            extractionMethod:
                "technology-alias",

            extractionConfidence:
                1.0,

            source:
                "gapwise-technology"
        });
    }


    return Array.from(detected.values());
};


module.exports = {
    extractTechnologies
};