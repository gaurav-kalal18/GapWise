const skillAliases = {
    "cpp": "C++",
    "c++": "C++",
    "c plus plus": "C++",

    "python 3": "Python",
    "python programming": "Python",
    "python development": "Python",

    "reactjs": "React",
    "react.js": "React",

    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js"
};

const normalizeSkill = (skill) => {
    const cleanedSkill = skill
        .trim()
        .toLowerCase();

    return skillAliases[cleanedSkill] || skill.trim();
};

module.exports = {
    normalizeSkill
};