const cleanResumeText = (text) => {
    if (!text) {
        return "";
    }

    return text
        // Normalize line endings
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")

        // Remove excessive spaces
        .replace(/[ \t]+/g, " ")

        // Remove excessive blank lines
        .replace(/\n{3,}/g, "\n\n")

        // Clean spaces around newlines
        .replace(/ *\n */g, "\n")

        .trim();
};


const detectSections = (text) => {
    const sections = {
        contact: "",
        education: "",
        skills: "",
        projects: "",
        experience: "",
        achievements: "",
        coursework: "",
        codingProfiles: "",
        positions: "",
        other: ""
    };

    const sectionPatterns = [
        { name: "education", pattern: /\bEducation\b/i },
        { name: "coursework", pattern: /\bRelevant Coursework\b/i },
        { name: "skills", pattern: /\bTechnical Skills\b/i },
        { name: "projects", pattern: /\bProjects\b/i },
        { name: "experience", pattern: /\b(?:Experience|Work Experience)\b/i },
        { name: "achievements", pattern: /\bAchievements\b/i },
        { name: "codingProfiles", pattern: /\bCoding Profiles\b/i },
        { name: "positions", pattern: /\bPosition of Responsibility\b/i }
    ];

    let currentSection = "contact";

    const lines = text.split("\n");

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
            continue;
        }

        let detectedSection = null;

        for (const section of sectionPatterns) {
            if (section.pattern.test(trimmedLine)) {
                detectedSection = section.name;
                break;
            }
        }

        if (detectedSection) {

            const sectionPattern = sectionPatterns.find(
                (section) => section.name === detectedSection
            ).pattern;

            const remainingText = trimmedLine
                .replace(sectionPattern, "")
                .trim();

            currentSection = detectedSection;

            if (remainingText) {
                sections[currentSection] += remainingText + "\n";
            }

            continue;
        }

        sections[currentSection] += trimmedLine + "\n";
    }

    // Remove trailing whitespace
    Object.keys(sections).forEach((section) => {
        sections[section] = sections[section].trim();
    });

    return sections;
};


const extractResumeStructure = (text) => {
    const cleanedText = cleanResumeText(text);

    const sections = detectSections(cleanedText);

    return {
        cleanedText,
        sections
    };
};


module.exports = {
    cleanResumeText,
    detectSections,
    extractResumeStructure
};