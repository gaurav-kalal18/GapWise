
"use strict";
const {
  getSessionUser,
  revokeSession
} = require("../services/auth.service");

const {
  requireTrustedOrigin,
  requireCookieMutation,
} = require("../middleware/request.origin");

const {
  loginRateLimit,
  registerRateLimit,
} = require("../middleware/auth.rateLimit");

const {
  readSessionCookie,
  clearSessionCookie
} = require("../middleware/session.cookie");
const express = require("express");
const { registerUser, loginUser, SESSION_DURATION_MS } =
  require("../services/auth.service");

const router = express.Router();

router.use(requireTrustedOrigin);

router.post("/auth/register", registerRateLimit, async (req, res) => {
  try {
    const user = await registerUser(req.body);

    return res.status(201).json({
      message: "Account created successfully.",
      user,
    });
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    console.error("User registration failed:", error.name);

    return res.status(500).json({
      message: "Unable to create account.",
    });
  }
});


router.post("/auth/login", loginRateLimit, async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const result = await loginUser(req.body);

    res.cookie("gapwise_session", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api",
      maxAge: SESSION_DURATION_MS,
    });

    return res.status(200).json({
      message: "Login successful.",
      user: result.user,
      expiresAt: result.expiresAt,
    });

  } catch (error) {
    if ([400, 401].includes(error.status)) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    console.error("User login failed:", error.name);

    return res.status(500).json({
      message: "Unable to log in.",
    });
  }
});


router.get("/auth/me", (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const token = readSessionCookie(req);
    const user = token ? getSessionUser(token) : null;

    if (!user) {
      return res.status(401).json({
        message: "Not authenticated.",
      });
    }

    return res.json({ user });
  } catch (error) {
    console.error(
  "Session verification failed:",
  error.stack
);

    return res.status(500).json({
      message: "Unable to verify session.",
    });
  }
});

router.post(
  "/auth/logout",
  requireCookieMutation,
  (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      const token = readSessionCookie(req);

      if (token) {
        revokeSession(token);
      }

      clearSessionCookie(res);

      return res.json({
        message: "Logged out successfully.",
      });
    } catch (error) {
      console.error("Logout failed:", error.name);

      return res.status(500).json({
        message: "Unable to log out.",
      });
    }
  }
);


module.exports = router;
