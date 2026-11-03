const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");

const INPUT_FILE = path.join(
    __dirname,
    "../../../data/esco/skills_en.csv"
);

const OUTPUT_DIR = path.join(
    __dirname,
    "../../../data/gapwise"
);

const OUTPUT_FILE = path.join(
    OUTPUT_DIR,
    "skills.json"
);

const ESCO_VERSION = "1.2.1";

const skills = [];

const normalizeAliases = (value) => {
    if (!value || !value.trim()) {
        return [];
    }

    return value
        .split(/\n|;/)
        .map((alias) => alias.trim())
        .filter(Boolean);
};

const mapSkill = (row) => {
    const sourceId = row.conceptUri;

    const id = `skill:esco:${sourceId.split("/").pop()}`;

    return {
        id,

        canonicalName: row.preferredLabel.trim(),

        description:
            row.definition?.trim() ||
            row.description?.trim() ||
            "",

        skillType: row.skillType?.trim() || "",

        aliases: [
            ...normalizeAliases(row.altLabels),
            ...normalizeAliases(row.hiddenLabels)
        ],

        categories: [],

        relations: {
            broader: [],
            narrower: [],
            related: [],
            essential: [],
            optional: []
        },

        prerequisites: [],

        occupations: [],

        sources: [
            {
                provider: "esco",
                sourceId,
                version: ESCO_VERSION
            }
        ],

        metadata: {
            language: "en",
            status:
                row.status?.trim() === "released"
                    ? "active"
                    : "deprecated"
        }
    };
};

const main = async () => {
    console.log("Starting ESCO skill import...");

    if (!fs.existsSync(INPUT_FILE)) {
        throw new Error(
            `ESCO file not found:\n${INPUT_FILE}`
        );
    }

    fs.mkdirSync(OUTPUT_DIR, {
        recursive: true
    });

    const parser = fs.createReadStream(INPUT_FILE).pipe(
        parse({
            columns: true,
            skip_empty_lines: true,
            bom: true,
            relax_quotes: true
        })
    );

    for await (const row of parser) {
        if (!row.conceptUri || !row.preferredLabel) {
            continue;
        }

        skills.push(mapSkill(row));
    }

    fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(skills, null, 2),
        "utf-8"
    );

    console.log(
        `Imported ${skills.length} ESCO skills.`
    );

    console.log(
        `Output written to:\n${OUTPUT_FILE}`
    );
};

main().catch((error) => {
    console.error("ESCO import failed:");
    console.error(error);
    process.exit(1);
});