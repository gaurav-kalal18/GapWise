
"use strict";

const { readSessionCookie } = require("./session.cookie");
const { getSessionUser } = require("../services/auth.service");

function requireAuth(req, res, next) {
  res.set("Cache-Control", "no-store");

  try {
    const token = readSessionCookie(req);
    const user = token ? getSessionUser(token) : null;

    if (!user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error(
      "Authentication middleware failed:",
      error.name
    );

    return res.status(500).json({
      message: "Unable to authenticate request.",
    });
  }
}

module.exports = { requireAuth };
