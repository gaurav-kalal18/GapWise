
"use strict";

const COOKIE_NAME = "gapwise_session";

function readSessionCookie(req) {
  const header = req.headers.cookie;

  if (typeof header !== "string") {
    return null;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) continue;

    const name = part.slice(0, separator).trim();

    if (name !== COOKIE_NAME) continue;

    const value = part.slice(separator + 1).trim();

    // Login tokens are hexadecimal, so no decoding is needed.
    if (/^[a-f0-9]{64}$/i.test(value)) {
      return value;
    }

    return null;
  }

  return null;
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
  });
}

module.exports = {
  readSessionCookie,
  clearSessionCookie,
};
