
"use strict";

function createRateLimiter({
  windowMs,
  maxRequests,
  now = () => Date.now(),
}) {
  if (
    !Number.isSafeInteger(windowMs) ||
    windowMs <= 0 ||
    !Number.isSafeInteger(maxRequests) ||
    maxRequests <= 0
  ) {
    throw new Error("Invalid rate limiter configuration.");
  }

  const requests = new Map();

  return function rateLimit(req, res, next) {
    const currentTime = now();

    // Use Express's IP resolution, not a client-supplied
    // X-Forwarded-For header.
    const ip = req.ip || req.socket?.remoteAddress || "unknown";

    // Clear expired entries to limit memory growth.
    for (const [key, record] of requests) {
      if (currentTime - record.start >= windowMs) {
        requests.delete(key);
      }
    }

    // Fail closed if the in-memory tracking capacity
    // is exhausted rather than permitting unlimited requests.
    if (!requests.has(ip) && requests.size >= 5000) {
      res.set("Retry-After", "60");
      return res.status(503).json({
        message: "Authentication temporarily unavailable.",
      });
    }

    let record = requests.get(ip);

    if (!record) {
      record = {
        start: currentTime,
        count: 0,
      };

      requests.set(ip, record);
    }

    if (record.count >= maxRequests) {
      const remainingMs = windowMs - (currentTime - record.start);
      const retryAfter = Math.max(
        1,
        Math.ceil(remainingMs / 1000)
      );

      res.set("Retry-After", String(retryAfter));

      return res.status(429).json({
        message: "Too many requests. Please try again later.",
      });
    }

    record.count += 1;

    return next();
  };
}

const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

const registerRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
});

module.exports = {
  createRateLimiter,
  loginRateLimit,
  registerRateLimit,
};
