const fs = require("fs");
const path = require("path");

const skillsFile = path.join(
    __dirname,
    "../../data/gapwise/skills.json"
);

const occupationsFile = path.join(
    __dirname,
    "../../data/gapwise/occupations.json"
);

const rolesFile = path.join(
    __dirname,
    "../../data/gapwise/roles.json"
);


// Load data
const skills = JSON.parse(
    fs.readFileSync(skillsFile, "utf-8")
);

const occupations = JSON.parse(
    fs.readFileSync(occupationsFile, "utf-8")
);

const roles = JSON.parse(
    fs.readFileSync(rolesFile, "utf-8")
);


// Create lookup maps
const skillMap = new Map(
    skills.map(skill => [skill.id, skill])
);

const occupationMap = new Map(
    occupations.map(occupation => [occupation.id, occupation])
);

const roleMap = new Map(
    roles.map(role => [role.id, role])
);


/**
 * Resolve a GapWise role into its canonical skills.
 */
const getRoleSkills = (roleId) => {

    const role = roleMap.get(roleId);

    if (!role) {
        throw new Error(`Role not found: ${roleId}`);
    }

    const essentialSkills = new Map();
    const optionalSkills = new Map();


    // Process all occupations mapped to this role
    for (const mapping of role.occupationMappings) {

        const occupation = occupationMap.get(
            mapping.occupationId
        );

        if (!occupation) {
            console.warn(
                `Occupation not found: ${mapping.occupationId}`
            );

            continue;
        }


        // -----------------------------------------
        // Essential skills
        // -----------------------------------------

        for (const skillId of occupation.skills.essential) {

            const skill = skillMap.get(skillId);

            if (!skill) {
                console.warn(
                    `Skill not found: ${skillId}`
                );

                continue;
            }

            essentialSkills.set(skillId, {
                ...skill,

                sourceOccupation: {
                    id: occupation.id,
                    name: occupation.canonicalName,
                    relation: mapping.relation
                }
            });
        }


        // -----------------------------------------
        // Optional skills
        // -----------------------------------------

        for (const skillId of occupation.skills.optional) {

            const skill = skillMap.get(skillId);

            if (!skill) {
                console.warn(
                    `Skill not found: ${skillId}`
                );

                continue;
            }

            // Don't add a skill to optional if it
            // is already essential.
            if (!essentialSkills.has(skillId)) {

                optionalSkills.set(skillId, {
                    ...skill,

                    sourceOccupation: {
                        id: occupation.id,
                        name: occupation.canonicalName,
                        relation: mapping.relation
                    }
                });
            }
        }
    }


    // -----------------------------------------
    // Final consistency check
    // -----------------------------------------

    // If a skill is essential for ANY mapped
    // occupation, it must not remain optional.
    for (const skillId of essentialSkills.keys()) {
        optionalSkills.delete(skillId);
    }


    // -----------------------------------------
    // Return resolved role
    // -----------------------------------------

    return {
        role: {
            id: role.id,
            name: role.name,
            description: role.description
        },

        skills: {
            essential: Array.from(
                essentialSkills.values()
            ),

            optional: Array.from(
                optionalSkills.values()
            )
        },

        statistics: {
            essential: essentialSkills.size,
            optional: optionalSkills.size,
            total:
                essentialSkills.size +
                optionalSkills.size
        }
    };
};


/**
 * Get all GapWise roles.
 */
const getRoles = () => {
    return roles;
};


/**
 * Get a single GapWise role.
 */
const getRole = (roleId) => {
    return roleMap.get(roleId) || null;
};


module.exports = {
    getRoleSkills,
    getRoles,
    getRole
};