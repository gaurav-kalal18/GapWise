const express = require("express");

const {
    getProfile,
    createProfile
} = require("../controllers/profile.controller");

const router = express.Router();

router.get("/profile", getProfile);
router.post("/profile", createProfile);

module.exports = router;