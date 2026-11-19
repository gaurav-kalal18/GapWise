
"use strict";

const {
  randomUUID,
  randomBytes,
  createHash,
} = require("node:crypto");
const { getDatabase } = require("../db/connection");
const {
  hashPassword,
  verifyPassword,
  validatePassword,
} = require("./password.service");

function validateRegistration({ name, email, password }) {
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80
  ) {
    throw Object.assign(
      new Error("Name must contain 2–80 characters."),
      { status: 400 }
    );
  }

  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw Object.assign(
      new Error("Enter a valid email address."),
      { status: 400 }
    );
  }

  try {
    validatePassword(password);
  } catch (error) {
    throw Object.assign(error, { status: 400 });
  }
}

async function registerUser(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw Object.assign(
      new Error("Invalid registration details."),
      { status: 400 }
    );
  }

  const { name, email, password } = input;

  validateRegistration({ name, email, password });

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDatabase();

  const existing = db.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).get(normalizedEmail);

  if (existing) {
    throw Object.assign(
      new Error("An account with this email already exists."),
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const id = randomUUID();

  try {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(id, name.trim(), normalizedEmail, passwordHash);
  } catch (error) {
    if (
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      throw Object.assign(
        new Error("An account with this email already exists."),
        { status: 409 }
      );
    }

    throw error;
  }

  return {
    id,
    name: name.trim(),
    email: normalizedEmail,
  };
}


const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function hashSessionToken(token) {
  return createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

async function loginUser(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw Object.assign(
      new Error("Invalid login details."),
      { status: 400 }
    );
  }

  const { email, password } = input;

  if (
    typeof email !== "string" ||
    email.length > 254 ||
    typeof password !== "string" ||
    password.length > 128 ||
    Buffer.byteLength(password, "utf8") > 256
  ) {
    throw Object.assign(
      new Error("Invalid login details."),
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDatabase();

  const user = db.prepare(`
    SELECT id, name, email, password_hash
    FROM users
    WHERE email = ?
  `).get(normalizedEmail);

  // Do not reveal whether an email belongs to an account.
  const validPassword = user
    ? await verifyPassword(password, user.password_hash)
    : false;

  if (!user || !validPassword) {
    throw Object.assign(
      new Error("Invalid email or password."),
      { status: 401 }
    );
  }

  const token = randomBytes(32).toString("hex");
  const sessionId = randomUUID();

  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_MS
  ).toISOString();

  db.prepare(`
    INSERT INTO sessions (
      id,
      user_id,
      token_hash,
      expires_at
    )
    VALUES (?, ?, ?, ?)
  `).run(
    sessionId,
    user.id,
    hashSessionToken(token),
    expiresAt
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token,
    expiresAt,
  };
}

//Add session verification
function getSessionUser(token) {
  // Tokens created by loginUser() are 32 random bytes,
  // encoded as exactly 64 hexadecimal characters.
  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    return null;
  }

  const db = getDatabase();

  const record = db.prepare(`
    SELECT
      s.id AS session_id,
      s.expires_at,
      u.id,
      u.name,
      u.email
    FROM sessions AS s
    JOIN users AS u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(hashSessionToken(token));

  if (!record) return null;

  const expiry = Date.parse(record.expires_at);

  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    // Remove invalid or expired sessions.
    db.prepare(
      "DELETE FROM sessions WHERE id = ?"
    ).run(record.session_id);

    return null;
  }

  return {
    id: record.id,
    name: record.name,
    email: record.email,
  };
}

function revokeSession(token) {
  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    return false;
  }

  const db = getDatabase();

  const result = db.prepare(
    "DELETE FROM sessions WHERE token_hash = ?"
  ).run(hashSessionToken(token));

  return result.changes > 0;
}


module.exports = {
  registerUser,
  validateRegistration,
  loginUser,
  hashSessionToken,
  SESSION_DURATION_MS,
  getSessionUser,
  revokeSession,
};