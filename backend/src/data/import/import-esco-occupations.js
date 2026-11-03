const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");

const INPUT_FILE = path.join(
    __dirname,
    "../../../data/esco/occupationSkillRelations_en.csv"
);

const OUTPUT_DIR = path.join(
    __dirname,
    "../../../data/gapwise"
);

const OUTPUT_FILE = path.join(
    OUTPUT_DIR,
    "occupations.json"
);

const ESCO_VERSION = "1.2.1";

const occupations = new Map();

const toSkillId = (skillUri) => {
    if (!skillUri) return null;

    const skillId = skillUri.split("/").pop();

    if (!skillId) return null;

    return `skill:esco:${skillId}`;
};

const main = async () => {
    console.log("Starting ESCO occupation import...");

    if (!fs.existsSync(INPUT_FILE)) {
        throw new Error(`ESCO file not found:\n${INPUT_FILE}`);
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const parser = fs.createReadStream(INPUT_FILE).pipe(
        parse({
            columns: true,
            skip_empty_lines: true,
            bom: true,
            relax_quotes: true
        })
    );

    for await (const row of parser) {
        if (
            !row.occupationUri ||
            !row.occupationLabel ||
            !row.skillUri
        ) {
            continue;
        }

        const occupationId = `occupation:esco:${row.occupationUri
            .split("/")
            .pop()}`;

        const skillId = toSkillId(row.skillUri);

        if (!skillId) continue;

        if (!occupations.has(occupationId)) {
            occupations.set(occupationId, {
                id: occupationId,
                canonicalName: row.occupationLabel.trim(),
                skills: {
                    essential: [],
                    optional: []
                },
                sources: [
                    {
                        provider: "esco",
                        sourceId: row.occupationUri,
                        version: ESCO_VERSION
                    }
                ]
            });
        }

        const occupation = occupations.get(occupationId);

        const relationType = row.relationType?.trim();

        if (
            relationType !== "essential" &&
            relationType !== "optional"
        ) {
            continue;
        }

        if (!occupation.skills[relationType].includes(skillId)) {
            occupation.skills[relationType].push(skillId);
        }
    }

    const result = Array.from(occupations.values());

    fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(result, null, 2),
        "utf-8"
    );

    console.log(`Imported ${result.length} ESCO occupations.`);
    console.log(`Output written to:\n${OUTPUT_FILE}`);
};

main().catch((error) => {
    console.error("ESCO occupation import failed:");
    console.error(error);
    process.exit(1);
});