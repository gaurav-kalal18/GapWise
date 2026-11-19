
"use strict";

const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5000",
];

function trustedOrigins() {
  const configured = process.env.GAPWISE_ALLOWED_ORIGINS;

  return new Set(
    configured
      ? configured.split(",").map(x => x.trim()).filter(Boolean)
      : LOCAL_ORIGINS
  );
}

function requireTrustedOrigin(req, res, next) {
  const origin = req.get("Origin");
  const fetchSite = req.get("Sec-Fetch-Site");

  // Browsers explicitly identifying a cross-site request
  // must not perform authenticated actions.
  if (fetchSite === "cross-site") {
    return res.status(403).json({
      message: "Cross-site request rejected.",
    });
  }

  // Origin is normally sent by browsers on POST requests.
  // Headerless CLI clients may continue for local testing.
  if (origin && !trustedOrigins().has(origin)) {
    return res.status(403).json({
      message: "Origin not allowed.",
    });
  }

  return next();
}

function requireCookieMutation(req, res, next) {
  // A custom header prevents ordinary cross-site HTML forms
  // from issuing authenticated mutations.
  if (req.get("X-GapWise-Request") !== "1") {
    return res.status(403).json({
      message: "Required request verification header missing.",
    });
  }

  return next();
}

module.exports = {
  requireTrustedOrigin,
  requireCookieMutation,
};
