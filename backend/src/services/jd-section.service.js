const normalizeText = (text) => {
    return text
        .toLowerCase()
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n+/g, "\n")
        .trim();
};

const SECTION_PATTERNS = [
    {
        type: "required",
        patterns: [
            /^required qualifications?$/i,
            /^basic qualifications?$/i,
            /^minimum qualifications?$/i,
            /^must[- ]have$/i,
            /^required skills?$/i,
            /^requirements?$/i
        ]
    },

    {
        type: "preferred",
        patterns: [
            /^preferred qualifications?$/i,
            /^preferred skills?$/i,
            /^nice[- ]to[- ]have$/i,
            /^desired qualifications?$/i,
            /^preferred experience$/i,
            /^bonus qualifications?$/i
        ]
    },

    {
        type: "responsibility",
        patterns: [
            /^responsibilities$/i,
            /^key responsibilities$/i,
            /^job responsibilities$/i,
            /^what you('ll| will) do$/i,
            /^duties$/i
        ]
    }
];

const detectSectionType = (line) => {
    const cleanLine = line.trim();

    if (!cleanLine) {
        return null;
    }

    for (const section of SECTION_PATTERNS) {
        for (const pattern of section.patterns) {
            if (pattern.test(cleanLine)) {
                return section.type;
            }
        }
    }

    return null;
};

const parseJDSections = (jdText) => {
    if (!jdText || typeof jdText !== "string") {
        throw new Error("JD text is required");
    }

    const text = normalizeText(jdText);

    const lines = text.split("\n");

    const sections = [];

    let currentSection = {
        type: "unknown",
        heading: null,
        content: [],
        start: 0,
        end: 0
    };

    let currentPosition = 0;

    for (const line of lines) {
        const lineStart = currentPosition;
        const lineEnd = lineStart + line.length;

        const sectionType = detectSectionType(line);

        if (sectionType) {
            if (
                currentSection.heading !== null ||
                currentSection.content.length > 0
            ) {
                currentSection.end = lineStart;

                sections.push(currentSection);
            }

            currentSection = {
                type: sectionType,
                heading: line.trim(),
                content: [],
                start: lineStart,
                end: lineEnd
            };

        } else {
            currentSection.content.push(line);
            currentSection.end = lineEnd;
        }

        currentPosition = lineEnd + 1;
    }

    if (
        currentSection.heading !== null ||
        currentSection.content.length > 0
    ) {
        sections.push(currentSection);
    }

    return sections.map(section => ({
        type: section.type,
        heading: section.heading,
        content: section.content,
        text: section.content.join("\n").trim(),
        start: section.start,
        end: section.end
    }));
};

module.exports = {
    parseJDSections,
    detectSectionType
};