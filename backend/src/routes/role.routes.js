const express = require("express");

const {
    getRoles,
    getRole,
    getRoleSkills
} = require("../controllers/role.controller");

const router = express.Router();


// GET /api/roles
router.get("/roles", getRoles);


// GET /api/roles/:roleId
router.get("/roles/:roleId", getRole);


// GET /api/roles/:roleId/skills
router.get("/roles/:roleId/skills", getRoleSkills);


module.exports = router;