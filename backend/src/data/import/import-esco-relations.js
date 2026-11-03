const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");

const SKILLS_FILE = path.join(
    __dirname,
    "../../../data/gapwise/skills.json"
);

const RELATIONS_FILE = path.join(
    __dirname,
    "../../../data/esco/skillSkillRelations_en.csv"
);

const normalizeSkillId = (uri) => {
    if (!uri) {
        return null;
    }

    const uuid = uri.split("/").pop();

    return `skill:esco:${uuid}`;
};

const main = async () => {
    console.log("Starting ESCO relationship import...");

    if (!fs.existsSync(SKILLS_FILE)) {
        throw new Error(
            `Skills file not found:\n${SKILLS_FILE}`
        );
    }

    if (!fs.existsSync(RELATIONS_FILE)) {
        throw new Error(
            `Relations file not found:\n${RELATIONS_FILE}`
        );
    }

    const skills = JSON.parse(
        fs.readFileSync(SKILLS_FILE, "utf-8")
    );

    /*
     * Create a lookup:
     *
     * ESCO source URI
     *        ↓
     * GapWise skill object
     */
    const skillMap = new Map();

    skills.forEach((skill) => {
        const source = skill.sources?.find(
            (source) => source.provider === "esco"
        );

        if (source?.sourceId) {
            skillMap.set(source.sourceId, skill);
        }
    });

    let totalRelations = 0;
    let essentialRelations = 0;
    let optionalRelations = 0;
    let skippedRelations = 0;

    const parser = fs
        .createReadStream(RELATIONS_FILE)
        .pipe(
            parse({
                columns: true,
                skip_empty_lines: true,
                bom: true,
                relax_quotes: true
            })
        );

    for await (const row of parser) {
        const originalSkill =
            skillMap.get(row.originalSkillUri);

        const relatedSkill =
            skillMap.get(row.relatedSkillUri);

        if (!originalSkill || !relatedSkill) {
            skippedRelations++;
            continue;
        }

        const relationType =
            row.relationType?.trim();

        const relatedSkillId =
            relatedSkill.id;

        if (relationType === "essential") {
            if (
                !originalSkill.relations.essential.includes(
                    relatedSkillId
                )
            ) {
                originalSkill.relations.essential.push(
                    relatedSkillId
                );

                essentialRelations++;
                totalRelations++;
            }
        }

        else if (relationType === "optional") {
            if (
                !originalSkill.relations.optional.includes(
                    relatedSkillId
                )
            ) {
                originalSkill.relations.optional.push(
                    relatedSkillId
                );

                optionalRelations++;
                totalRelations++;
            }
        }
    }

    fs.writeFileSync(
        SKILLS_FILE,
        JSON.stringify(skills, null, 2),
        "utf-8"
    );

    console.log("\nESCO relationship import completed.");

    console.log(
        `Total relationships added: ${totalRelations}`
    );

    console.log(
        `Essential relationships: ${essentialRelations}`
    );

    console.log(
        `Optional relationships: ${optionalRelations}`
    );

    console.log(
        `Skipped relationships: ${skippedRelations}`
    );

    console.log(
        `Updated file:\n${SKILLS_FILE}`
    );
};

main().catch((error) => {
    console.error("\nESCO relationship import failed:");
    console.error(error);
    process.exit(1);
});